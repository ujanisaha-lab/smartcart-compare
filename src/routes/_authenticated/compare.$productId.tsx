import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, BellRing, ExternalLink, Sparkles, Minus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { alertsQuery, removeAlert, setAlert, storesQuery } from "@/lib/data";
import { STORES, inr, productById, storeById, trendOf, type Store } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/compare/$productId")({
  loader: ({ params }) => {
    const product = productById(params.productId);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name ?? "Compare"} — CartBrain` },
      { name: "description", content: `Compare ${loaderData?.product.name ?? "product"} prices across stores.` },
      { property: "og:title", content: `${loaderData?.product.name ?? "Compare"} — CartBrain` },
      { property: "og:description", content: "Live price comparison with drop alerts." },
    ],
  }),
  component: Compare,
});

const TAG = {
  up: { cls: "bg-up/15 text-up border-up/40", label: "Price up", Icon: ArrowUp },
  down: { cls: "bg-down/15 text-down border-down/40", label: "Price drop", Icon: ArrowDown },
  new: { cls: "bg-new/15 text-new border-new/40", label: "New arrival", Icon: Sparkles },
  same: { cls: "border-border text-muted-foreground", label: "No change", Icon: Minus },
};

function Compare() {
  const { product } = Route.useLoaderData();
  const qc = useQueryClient();
  const { data: stores = [] } = useQuery(storesQuery);
  const { data: alerts = [] } = useQuery(alertsQuery);
  const alert = alerts.find((a) => a.product_id === product.id);
  const [target, setTarget] = useState("");
  const [shop, setShop] = useState<Store | null>(null);

  const ids = stores.length ? stores : STORES.map((s) => s.id);
  const rows = product.offers.filter((o) => ids.includes(o.storeId)).sort((a, b) => Number(!a.inStock) - Number(!b.inStock) || a.price - b.price);
  const cheapest = rows.find((r) => r.inStock);

  const saveAlert = async () => {
    const n = Number(target);
    if (!n || n <= 0) return toast.error("Enter a valid target price");
    try { await setAlert(product.id, n); toast.success(`We'll notify you when any app drops below ${inr(n)}`); setTarget(""); qc.invalidateQueries({ queryKey: alertsQuery.queryKey }); }
    catch { toast.error("Couldn't save alert"); }
  };

  return (
    <div className="space-y-6">
      <Link to="/home" className="text-sm text-muted-foreground hover:text-primary">← Back to search</Link>
      <div className="flex flex-wrap items-center gap-4 rounded-3xl glass p-6">
        <span className="grid size-20 place-items-center rounded-2xl bg-muted text-5xl">{product.emoji}</span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground">{product.category}</p>
          {cheapest && <p className="mt-1">Best: <span className="text-xl font-bold text-neon">{inr(cheapest.price)}</span> on {storeById(cheapest.storeId)?.name}</p>}
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

      {!stores.length && <p className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">Showing all apps. Choose your apps on the home page to narrow this table.</p>}

      <div className="flex flex-wrap gap-2 text-xs">
        {(["down", "up", "new"] as const).map((k) => { const T = TAG[k]; return <span key={k} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${T.cls}`}><T.Icon className="size-3" />{T.label}</span>; })}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="p-3">App</th><th className="p-3">Price</th><th className="p-3">Change</th><th className="p-3">Refund window</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const s = storeById(o.storeId)!;
              const t = trendOf(o);
              const T = TAG[t];
              const diff = o.previous ? o.price - o.previous : 0;
              return (
                <tr key={o.storeId} className={`border-t border-border ${o === cheapest ? "bg-accent/50" : ""}`}>
                  <td className="p-3 font-medium">{s.name}{o === cheapest && <span className="ml-2 rounded-full bg-neon px-2 py-0.5 text-[10px] font-bold text-primary-foreground">BEST</span>}</td>
                  <td className="p-3">{o.inStock ? <b>{inr(o.price)}</b> : <span className="text-muted-foreground">Out of stock</span>}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${T.cls}`}>
                      <T.Icon className="size-3" />{t === "up" || t === "down" ? inr(Math.abs(diff)) : T.label}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => setShop(s)} className="inline-flex items-center gap-1 text-primary hover:underline"><ShieldCheck className="size-4" />{s.refund.window}</button>
                  </td>
                  <td className="p-3 text-right">
                    <button disabled={!o.inStock} onClick={() => setShop(s)} className="inline-flex items-center gap-1 rounded-full bg-neon px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                      Buy <ExternalLink className="size-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
                <a href={shop.url(product.name)} target="_blank" rel="noopener noreferrer"
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
