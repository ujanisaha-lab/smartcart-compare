import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { STORES } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/refunds")({
  head: () => ({
    meta: [
      { title: "Refund guide — CartBrain" },
      { name: "description", content: "Clear, side-by-side refund and return policies for every shopping app." },
      { property: "og:title", content: "Refund guide — CartBrain" },
      { property: "og:description", content: "Know your refund rights before you buy." },
    ],
  }),
  component: Refunds,
});

const STEPS = [
  "Raise the return from the store's own order page within the window.",
  "Keep the original box, tags, invoice and an unboxing video for expensive items.",
  "Choose 'refund to original payment' if you don't want wallet credit.",
  "If the refund is late, escalate with the store, then the National Consumer Helpline (1915).",
];

function Refunds() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Refunds, made <span className="text-neon">clear</span></h1>
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-neon font-bold text-primary-foreground">{i + 1}</span>{s}
          </li>
        ))}
      </ol>
      <div className="grid gap-3 sm:grid-cols-2">
        {STORES.map((s) => (
          <div key={s.id} className="rounded-2xl glass p-5">
            <p className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldCheck className="size-5 text-primary" />{s.name}</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Window</dt><dd>{s.refund.window}</dd>
              <dt className="text-muted-foreground">Refund to</dt><dd>{s.refund.mode}</dd>
              <dt className="text-muted-foreground">Time</dt><dd>{s.refund.time}</dd>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">⚠ {s.refund.notes}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Policies are typical guidelines; always confirm on the product page.</p>
    </div>
  );
}
