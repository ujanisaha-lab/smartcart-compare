import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Check, Loader2, Plus, Search, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { profileQuery, storesQuery, toggleStore } from "@/lib/data";
import { STORES, storeById } from "@/lib/catalog";
import { searchProducts, type Suggestion } from "@/lib/prices.functions";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "CartBrain — Home" },
      { name: "description", content: "Pick your shopping apps and search any product to compare live prices." },
      { property: "og:title", content: "CartBrain — Home" },
      { property: "og:description", content: "Pick your shopping apps and compare live prices instantly." },
    ],
  }),
  component: Home,
});

const POPULAR = ["iPhone 16 128GB", "Samsung Galaxy S25", "boAt Airdopes 141", "Sony WH-1000XM5", "Nike running shoes", "Philips air fryer"];

function Home() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useServerFn(searchProducts);
  const { data: profile } = useQuery(profileQuery);
  const { data: stores = [] } = useQuery(storesQuery);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Suggestion[] | null>(null);

  const toggle = async (id: string) => {
    const add = !stores.includes(id);
    qc.setQueryData(storesQuery.queryKey, add ? [...stores, id] : stores.filter((s) => s !== id));
    try { await toggleStore(id, add); } catch { toast.error("Couldn't update apps"); }
    qc.invalidateQueries({ queryKey: storesQuery.queryKey });
  };

  const run = async (term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    setQ(t);
    setBusy(true);
    try {
      const r = await search({ data: { q: t } });
      setResults(r.results);
      if (r.error) toast.message(r.error);
    } catch {
      setResults([{ title: t, storeId: null }]);
    } finally {
      setBusy(false);
    }
  };

  const open = (title: string) => navigate({ to: "/compare", search: { q: title } });

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
        <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="relative">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any product — phones, shoes, groceries…" maxLength={120}
            className="w-full rounded-full border border-input bg-card py-3.5 pl-12 pr-32 outline-none focus:border-primary focus:shadow-neon" />
          <button disabled={busy || q.trim().length < 2} className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-neon px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Search"}
          </button>
        </form>

        {!results && !busy && (
          <div className="mt-4 flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <button key={p} onClick={() => run(p)} className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground">{p}</button>
            ))}
          </div>
        )}

        {busy && <p className="mt-5 text-sm text-muted-foreground">Searching live across stores…</p>}

        {results && !busy && (
          <div className="mt-5 space-y-2">
            <p className="text-sm text-muted-foreground">Pick the exact product to compare:</p>
            {results.map((r) => (
              <button key={r.title} onClick={() => open(r.title)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-neon">
                <span>
                  <span className="font-medium">{r.title}</span>
                  {r.storeId && <span className="ml-2 text-xs text-muted-foreground">seen on {storeById(r.storeId)?.name}</span>}
                </span>
                <ArrowRight className="size-4 shrink-0 text-primary" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
