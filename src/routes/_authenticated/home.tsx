import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { Check, Plus, Search, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { profileQuery, storesQuery, toggleStore } from "@/lib/data";
import { STORES, bestOffer, inr, searchProducts, storeById } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "CartBrain — Home" },
      { name: "description", content: "Pick your shopping apps and search any product to compare prices." },
      { property: "og:title", content: "CartBrain — Home" },
      { property: "og:description", content: "Pick your shopping apps and compare prices instantly." },
    ],
  }),
  component: Home,
});

function Home() {
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery);
  const { data: stores = [] } = useQuery(storesQuery);
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const results = searchProducts(dq);

  const toggle = async (id: string) => {
    const add = !stores.includes(id);
    qc.setQueryData(storesQuery.queryKey, add ? [...stores, id] : stores.filter((s) => s !== id));
    try { await toggleStore(id, add); }
    catch { toast.error("Couldn't update stores"); }
    qc.invalidateQueries({ queryKey: storesQuery.queryKey });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl glass p-6 sm:p-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Welcome <span className="text-neon">{profile?.display_name || "friend"}</span>!! let's buy together
        </h1>
        <p className="mt-2 text-muted-foreground">
          {stores.length ? `Comparing across ${stores.length} app${stores.length > 1 ? "s" : ""}: ${stores.map((s) => storeById(s)?.name).join(", ")}` : "Add the shopping apps you want in your comparison."}
        </p>
        <Dialog>
          <DialogTrigger className="mt-5 inline-flex items-center gap-2 rounded-full bg-neon px-5 py-2.5 font-semibold text-primary-foreground shadow-neon hover:brightness-110">
            <StoreIcon className="size-4" /> Choose shopping apps
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add apps to compare</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Apps are linked inside CartBrain — nothing gets downloaded to your phone.</p>
            <div className="grid grid-cols-2 gap-2">
              {STORES.map((s) => {
                const on = stores.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggle(s.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${on ? "border-primary bg-accent" : "border-border hover:border-primary/60"}`}>
                    {s.name}
                    {on ? <Check className="size-4 text-primary" /> : <Plus className="size-4 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </section>

      <section>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products — iPhone, headphones, shoes…"
            className="w-full rounded-full border border-input bg-card py-3.5 pl-12 pr-4 outline-none focus:border-primary focus:shadow-neon" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => {
            const best = bestOffer(p, stores);
            return (
              <Link key={p.id} to="/compare/$productId" params={{ productId: p.id }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-neon">
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-3xl">{p.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                  <p className="mt-1 text-sm">{best ? <>From <span className="font-bold text-neon">{inr(best.price)}</span> on {storeById(best.storeId)?.name}</> : <span className="text-muted-foreground">Add apps to see prices</span>}</p>
                </div>
              </Link>
            );
          })}
          {results.length === 0 && <p className="text-muted-foreground">No products match "{q}".</p>}
        </div>
      </section>
    </div>
  );
}
