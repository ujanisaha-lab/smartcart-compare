import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { Bell, Brain, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { alertsQuery, storesQuery } from "@/lib/data";
import { inr, productById, storeById, triggeredOffers } from "@/lib/catalog";

export function AppHeader() {
  const navigate = useNavigate();
  const { data: alerts = [] } = useQuery(alertsQuery);
  const { data: stores = [] } = useQuery(storesQuery);

  const hits = useMemo(
    () =>
      alerts.flatMap((a) => {
        const p = productById(a.product_id);
        if (!p) return [];
        const offers = triggeredOffers(p, a.target_price, stores);
        return offers.length ? [{ alert: a, product: p, offers }] : [];
      }),
    [alerts, stores],
  );

  const announced = useRef(false);
  useEffect(() => {
    if (announced.current || hits.length === 0) return;
    announced.current = true;
    const multi = hits.filter((h) => h.offers.length > 1).length;
    toast.success(`Price drop on ${hits.length} item${hits.length > 1 ? "s" : ""}${multi ? ` — ${multi} across multiple stores` : ""}!`);
  }, [hits]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/home" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-neon text-primary-foreground"><Brain className="size-5" /></span>
          <span className="font-display text-lg font-bold">Cart<span className="text-neon">Brain</span></span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/home" className="rounded-full px-3 py-1.5 hover:bg-accent" activeProps={{ className: "bg-accent" }}>Home</Link>
          <Link to="/refunds" className="rounded-full px-3 py-1.5 hover:bg-accent" activeProps={{ className: "bg-accent" }}>Refunds</Link>
          <Popover>
            <PopoverTrigger className="relative rounded-full p-2 hover:bg-accent" aria-label="Notifications">
              <Bell className="size-5" />
              {hits.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-down text-[10px] font-bold text-primary-foreground">{hits.length}</span>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <p className="mb-2 font-display font-semibold">Price drop alerts</p>
              {hits.length === 0 ? (
                <p className="text-sm text-muted-foreground">{alerts.length ? "No targets hit yet. We'll ping you." : "Set an alert on any product to get notified."}</p>
              ) : (
                <ul className="space-y-2">
                  {hits.map((h) => (
                    <li key={h.alert.id}>
                      <Link to="/compare/$productId" params={{ productId: h.product.id }} className="block rounded-lg border border-border p-2 hover:border-primary">
                        <p className="text-sm font-medium">{h.product.emoji} {h.product.name}</p>
                        <p className="text-xs text-down">
                          Below {inr(h.alert.target_price)} on {h.offers.map((o) => storeById(o.storeId)?.name).join(", ")}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>
          <button
            aria-label="Sign out"
            className="rounded-full p-2 hover:bg-accent"
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
          >
            <LogOut className="size-5" />
          </button>
        </nav>
      </div>
    </header>
  );
}
