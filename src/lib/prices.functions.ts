import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STORES, cleanTitle, normalizeQuery, type Offer } from "./catalog";

const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";
const PRICE_TTL_MS = 6 * 60 * 60 * 1000; // shared across all users -> few live lookups
const SEARCH_TTL_MS = 24 * 60 * 60 * 1000;

function headers() {
  const a = process.env["LOVABLE_API_KEY"];
  const b = process.env["FIRECRAWL_API_KEY"];
  if (!a || !b) throw new Error("Price service is not configured");
  return { "Content-Type": "application/json", Authorization: `Bearer ${a}`, "X-Connection-Api-Key": b };
}

async function firecrawlSearch(body: unknown, timeoutMs: number) {
  const res = await fetch(`${GATEWAY}/search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    console.error(`Firecrawl ${res.status}: ${(await res.text()).slice(0, 300)}`);
    throw new Error(`lookup failed (${res.status})`);
  }
  const j = (await res.json()) as { data?: { web?: any[] } | any[] };
  return (Array.isArray(j.data) ? j.data : j.data?.web) ?? [];
}

export type Suggestion = { title: string; storeId: string | null };

export const searchProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().trim().min(2).max(120) }).parse(d))
  .handler(async ({ data }): Promise<{ results: Suggestion[]; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = normalizeQuery(data.q);
    const { data: cached } = await supabaseAdmin.from("search_cache").select("results, fetched_at").eq("query_key", key).maybeSingle();
    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < SEARCH_TTL_MS) {
      return { results: cached.results as Suggestion[] };
    }
    try {
      const sites = "(site:amazon.in OR site:flipkart.com OR site:croma.com OR site:myntra.com OR site:reliancedigital.in)";
      const web = await firecrawlSearch({ query: `${data.q} ${sites}`, limit: 10, country: "in" }, 15000);
      const seen = new Set<string>();
      const results: Suggestion[] = [];
      for (const r of web) {
        const title = cleanTitle(String(r.title ?? ""));
        const url = String(r.url ?? "");
        if (title.length < 4 || /search|results for|\bbest\b.*\bunder\b/i.test(title)) continue;
        const k = normalizeQuery(title);
        if (seen.has(k)) continue;
        seen.add(k);
        results.push({ title, storeId: STORES.find((s) => url.includes(s.domain))?.id ?? null });
      }
      // Always let the user compare exactly what they typed.
      if (!seen.has(key)) results.push({ title: data.q, storeId: null });
      await supabaseAdmin.from("search_cache").upsert({ query_key: key, results, fetched_at: new Date().toISOString() });
      return { results };
    } catch (e) {
      console.error(e);
      return { results: [{ title: data.q, storeId: null }], error: "Live search is busy — you can still compare what you typed." };
    }
  });

const priceSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    price: { type: "number", description: "Current selling price in INR" },
    mrp: { type: "number" },
    in_stock: { type: "boolean" },
    image: { type: "string" },
  },
};

async function fetchStoreOffer(domain: string, q: string) {
  const web = await firecrawlSearch(
    {
      query: `site:${domain} ${q}`,
      limit: 1,
      country: "in",
      scrapeOptions: {
        onlyMainContent: true,
        formats: [{ type: "json", prompt: "Extract the main product on this page: title, current selling price in INR (number), MRP (number), whether it is in stock, main image URL.", schema: priceSchema }],
      },
    },
    40000,
  );
  const r = web[0];
  if (!r) return null;
  const j = r.json ?? {};
  const price = typeof j.price === "number" && j.price > 0 ? j.price : null;
  return {
    title: (j.title as string) || cleanTitle(String(r.title ?? "")) || null,
    price,
    mrp: typeof j.mrp === "number" && j.mrp > 0 ? j.mrp : null,
    in_stock: price !== null && j.in_stock !== false,
    url: String(r.url ?? "") || null,
    image: (j.image as string) || r.metadata?.ogImage || null,
  };
}

export const comparePrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ q: z.string().trim().min(2).max(160), stores: z.array(z.string()).max(STORES.length), refresh: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<{ offers: Offer[]; failed: string[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = normalizeQuery(data.q);
    const stores = STORES.filter((s) => data.stores.includes(s.id));
    const failed: string[] = [];

    const offers = await Promise.all(
      stores.map(async (s): Promise<Offer | null> => {
        const { data: hist } = await supabaseAdmin
          .from("price_snapshots")
          .select("title, price, mrp, in_stock, url, image, fetched_at")
          .eq("query_key", key).eq("store_id", s.id)
          .order("fetched_at", { ascending: false }).limit(6);
        let latest = hist?.[0];
        let older = hist?.slice(1) ?? [];
        const fresh = latest && Date.now() - new Date(latest.fetched_at).getTime() < (data.refresh ? 15 * 60 * 1000 : PRICE_TTL_MS);
        if (!fresh) {
          try {
            const got = await fetchStoreOffer(s.domain, data.q);
            const row = { query_key: key, store_id: s.id, title: got?.title ?? null, price: got?.price ?? null, mrp: got?.mrp ?? null, in_stock: got?.in_stock ?? false, url: got?.url ?? null, image: got?.image ?? null };
            const { data: ins } = await supabaseAdmin.from("price_snapshots").insert(row).select("title, price, mrp, in_stock, url, image, fetched_at").single();
            if (latest) older = [latest, ...older];
            latest = ins ?? { ...row, fetched_at: new Date().toISOString() };
          } catch (e) {
            console.error(s.id, e);
            failed.push(s.id);
            if (!latest) return null;
          }
        }
        if (!latest) return null;
        const prev = older.find((h) => h.price !== null);
        return {
          storeId: s.id,
          title: latest.title,
          price: latest.price === null ? null : Number(latest.price),
          previous: prev ? Number(prev.price) : null,
          mrp: latest.mrp === null ? null : Number(latest.mrp),
          inStock: latest.in_stock && latest.price !== null,
          url: latest.url,
          image: latest.image,
          fetchedAt: latest.fetched_at,
        };
      }),
    );
    return { offers: offers.filter((o): o is Offer => o !== null), failed };
  });
