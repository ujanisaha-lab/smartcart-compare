import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { ArrowDown, ArrowUp, BellRing, ExternalLink, Loader2, Minus, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { alertsQuery, removeAlert, setAlert, storesQuery } from "@/lib/data";
import { STORES, inr, normalizeQuery, storeById, trendOf, type Offer, type Store } from "@/lib/catalog";
import { comparePrices } from "@/lib/prices.functions";

export const Route = createFileRoute("/_authenticated/compare")({
  validateSearch: z.object({ q: z.string().min(1).max(160) }),
  head: ({ match }) => {
    const q = (match.search as { q?: string }).q ?? "Compare";
    return {
      meta: [
        { title: `${q} — price comparison | CartBrain` },
        { name: "description", content: `Live prices for ${q} across Indian shopping apps.` },
        { property: "og:title", content: `${q} — CartBrain` },
        { property: "og:description", content: "Live price comparison with drop alerts." },
      ],
    };
  },
  component: Compare,
});

const TAG = {
  up: { cls: "bg-up/15 text-up border-up/40", label: "Price up", Icon: ArrowUp },
  down: { cls: "bg-down/15 text-down border-down/40", label: "Price drop", Icon: ArrowDown },
  new: { cls: "bg-new/15 text-new border-new/40", label: "New arrival", Icon: Sparkles },
  same: { cls: "border-border text-muted-foreground", label: "No change", Icon: Minus },
};

function Compare() {
  const { q } = Route.useSearch();
  const qc = useQueryClient();
  const compare = useServerFn(comparePrices);
  const { data: stores = [], isFetched } = useQuery(storesQuery);
  const ids = stores.length ? stores : STORES.map((s) => s.id);
  const { data: alerts = [] } = useQuery(alertsQuery);
  const alert = alerts.find((a) => a.product_id === normalizeQuery(q));
  const [target, setTarget] = useState("");
  const [shop, setShop] = useState<Store | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const pricesKey = ["compare", normalizeQuery(q), [...ids].sort()];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: pricesKey,
    enabled: isFetched,
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: () => compare({ data: { q, stores: ids } }),
  });

  const refresh = async () => {
    setRefreshing(true);
    try { qc.setQueryData(pricesKey, await compare({ data: { q, stores: ids, refresh: true } })); }
    catch { toast.error("Couldn't refresh right now"); }
    setRefreshing(false);
  };

  const offers: Offer[] = data?.offers ?? [];
  const rows = [...offers].sort((a, b) => Number(!a.inStock) - Number(!b.inStock) || (a.price ?? 1e12) - (b.price ?? 1e12));
  const cheapest = rows.find((r) => r.inStock && r.price !== null);
  const image = cheapest?.image ?? rows.find((r) => r.image)?.image;

  const saveAlert = async () => {
    const n = Number(target);
    if (!n || n <= 0) return toast.error("Enter a valid target price");
    try { await setAlert(q, n); toast.success(`We'll notify you when any app drops below ${inr(n)}`); setTarget(""); qc.invalidateQueries({ queryKey: alertsQuery.queryKey }); }
    catch { toast.error("Couldn't save alert"); }
  };

  return (
    <div className="space-y-6">
      <Link to="/home" className="text-sm text-muted-foreground hover:text-primary">← Back to search</Link>
      <div className="flex flex-wrap items-center gap-4 rounded-3xl glass p-6">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted">
          {image ? <img src={image} alt={q} className="size-full object-contain" referrerPolicy="no-referrer" /> : <Sparkles className="size-8 text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{q}</h1>
          {cheapest ? (
            <p className="mt-1">Best: <span className="text-xl font-bold text-neon">{inr(cheapest.price!)}</span> on {storeById(cheapest.storeId)?.name}</p>
          ) : (
            <p className="text-muted-foreground">{isLoading ? "Checking live prices…" : "Live prices"}</p>
          )}
        </div>
        <div className="w-full space-y-2 sm:w-auto">
          <p className="flex items-center gap-1.5 text-sm font-medium"><BellRing className="size-4 text-primary" /> Price drop alert</p>
          {alert ? (
            <div className="flex items-center gap-2 text-sm">
              Notify below <b>{inr(alert.target_price)}</b>
              <button className="text-destructive hover:underline" onClick={async () => { await removeAlert(alert.id); qc.invalidateQueries({ queryKey: alertsQuery.queryKey }); }}>Remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} placeholder="Target ₹" inputMode="numeric"
                className="w-32 rounded-full border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary" />
              <button onClick={saveAlert} className="rounded-full bg-neon px-4 py-1.5 text-sm font-semibold text-primary-foreground">Set</button>
            </div>
          )}
        </div>
      </div>

      {!stores.length && isFetched && <p className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">Checking all apps. Choose your apps on the home page to make this faster.</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-2">
          {(["down", "up", "new"] as const).map((k) => { const T = TAG[k]; return <span key={k} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${T.cls}`}><T.Icon className="size-3" />{T.label}</span>; })}
        </div>
        <button onClick={refresh} disabled={refreshing || isLoading} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:border-primary disabled:opacity-50">
          <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} /> Refresh prices
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Fetching live prices from {ids.length} apps — this can take up to 30 seconds the first time.
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm">
          Couldn't reach the stores right now. <button onClick={() => refetch()} className="text-primary hover:underline">Try again</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-3">App</th><th className="p-3">Listing</th><th className="p-3">Price</th><th className="p-3">Change</th><th className="p-3">Refund</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {ids.map((id) => {
                const s = storeById(id)!;
                const o = rows.find((r) => r.storeId === id);
                const failed = data?.failed.includes(id);
                const t = o ? trendOf(o) : "new";
                const T = TAG[t];
                const diff = o?.price != null && o.previous != null ? o.price - o.previous : 0;
                return (
                  <tr key={id} className={`border-t border-border ${o && o === cheapest ? "bg-accent/50" : ""}`}>
                    <td className="p-3 font-medium">{s.name}{o && o === cheapest && <span className="ml-2 rounded-full bg-neon px-2 py-0.5 text-[10px] font-bold text-primary-foreground">BEST</span>}</td>
                    <td className="max-w-[16rem] p-3 text-xs text-muted-foreground"><span className="line-clamp-2">{o?.title ?? "—"}</span></td>
                    <td className="p-3">
                      {o?.inStock && o.price != null ? <b>{inr(o.price)}</b>
                        : <span className="text-muted-foreground">{failed ? "Store busy" : o ? "Not available" : "Not listed"}</span>}
                      {o?.mrp && o.price && o.mrp > o.price ? <span className="block text-xs text-muted-foreground line-through">{inr(o.mrp)}</span> : null}
                    </td>
                    <td className="p-3">
                      {o?.price != null && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${T.cls}`}>
                          <T.Icon className="size-3" />{t === "up" || t === "down" ? inr(Math.abs(diff)) : T.label}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <button onClick={() => setShop(s)} className="inline-flex items-center gap-1 text-primary hover:underline"><ShieldCheck className="size-4" />{s.refund.window}</button>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => setShop(s)} className="inline-flex items-center gap-1 rounded-full bg-neon px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                        {o?.url ? "Buy" : "Search"} <ExternalLink className="size-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {cheapest && <p className="text-xs text-muted-foreground">Prices updated {new Date(cheapest.fetchedAt).toLocaleString("en-IN")}. Final price may change at checkout.</p>}

      <Sheet open={!!shop} onOpenChange={(v) => !v && setShop(null)}>
        <SheetContent>
          {shop && (
            <>
              <SheetHeader><SheetTitle>Buy on {shop.name}</SheetTitle></SheetHeader>
              <div className="space-y-4 px-4 text-sm">
                <div className="rounded-xl border border-primary/40 bg-accent/40 p-4">
                  <p className="mb-2 flex items-center gap-1.5 font-semibold"><ShieldCheck className="size-4 text-primary" /> Refund policy — read before you pay</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                    <dt className="text-muted-foreground">Return window</dt><dd>{shop.refund.window}</dd>
                    <dt className="text-muted-foreground">Refund to</dt><dd>{shop.refund.mode}</dd>
                    <dt className="text-muted-foreground">Time to credit</dt><dd>{shop.refund.time}</dd>
                  </dl>
                  <p className="mt-2 text-xs text-muted-foreground">⚠ {shop.refund.notes}</p>
                </div>
                <a href={rows.find((r) => r.storeId === shop.id)?.url ?? shop.url(q)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full bg-neon py-2.5 font-semibold text-primary-foreground shadow-neon">
                  Continue to {shop.name} <ExternalLink className="size-4" />
                </a>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
