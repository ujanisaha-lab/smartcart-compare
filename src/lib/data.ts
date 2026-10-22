import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeQuery } from "./catalog";

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ?? { display_name: "" };
  },
});

export const storesQuery = queryOptions({
  queryKey: ["user_stores"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("user_stores").select("store_id");
    if (error) throw error;
    return (data ?? []).map((r) => r.store_id);
  },
});

export type Alert = { id: string; product_id: string; product_title: string | null; target_price: number };

export const alertsQuery = queryOptions({
  queryKey: ["price_alerts"],
  staleTime: 60_000,
  queryFn: async (): Promise<Alert[]> => {
    const { data, error } = await supabase.from("price_alerts").select("id, product_id, product_title, target_price").limit(200);
    if (error) throw error;
    return (data ?? []).map((a) => ({ ...a, target_price: Number(a.target_price) }));
  },
});

/** Latest known price per store for each alerted product (from the shared price cache). */
export const alertPricesQuery = (keys: string[]) =>
  queryOptions({
    queryKey: ["alert_prices", keys],
    staleTime: 5 * 60_000,
    enabled: keys.length > 0,
    queryFn: async () => {
      const since = new Date(Date.now() - 3 * 24 * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("price_snapshots")
        .select("query_key, store_id, price, in_stock, fetched_at")
        .in("query_key", keys).gte("fetched_at", since)
        .order("fetched_at", { ascending: false }).limit(1000);
      if (error) throw error;
      const latest = new Map<string, { storeId: string; price: number | null; inStock: boolean }[]>();
      const seen = new Set<string>();
      for (const r of data ?? []) {
        const k = r.query_key + "|" + r.store_id;
        if (seen.has(k)) continue;
        seen.add(k);
        const arr = latest.get(r.query_key) ?? [];
        arr.push({ storeId: r.store_id, price: r.price === null ? null : Number(r.price), inStock: r.in_stock });
        latest.set(r.query_key, arr);
      }
      return Object.fromEntries(latest);
    },
  });

export async function toggleStore(storeId: string, add: boolean) {
  const id = await uid();
  const q = add
    ? supabase.from("user_stores").upsert({ user_id: id, store_id: storeId })
    : supabase.from("user_stores").delete().eq("user_id", id).eq("store_id", storeId);
  const { error } = await q;
  if (error) throw error;
}

export async function setAlert(title: string, target: number) {
  const id = await uid();
  const { error } = await supabase
    .from("price_alerts")
    .upsert({ user_id: id, product_id: normalizeQuery(title), product_title: title, target_price: target }, { onConflict: "user_id,product_id" });
  if (error) throw error;
}

export async function removeAlert(alertId: string) {
  const { error } = await supabase.from("price_alerts").delete().eq("id", alertId);
  if (error) throw error;
}
