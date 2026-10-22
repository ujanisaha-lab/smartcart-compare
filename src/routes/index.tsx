import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CartBrain — Sign in" },
      { name: "description", content: "Sign in to CartBrain and compare prices across all your shopping apps." },
      { property: "og:title", content: "CartBrain — Sign in" },
      { property: "og:description", content: "Compare prices, track drops, and understand refunds in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [spinKey, setSpinKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/home" }); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) navigate({ to: "/home" }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const switchMode = () => {
    setSpinKey((k) => k + 1);
    setTimeout(() => setMode((m) => (m === "in" ? "up" : "in")), 400); // swap at mid-spin
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message);
  };

  const field = "w-full rounded-full border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary focus:shadow-neon transition";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10" style={{ perspective: "1200px" }}>
      <div className="flex items-center gap-2">
        <div className="grid size-10 place-items-center rounded-xl bg-neon text-primary-foreground"><Brain className="size-6" /></div>
        <span className="font-display text-2xl font-bold">Cart<span className="text-neon">Brain</span></span>
      </div>

      <div className="relative size-[min(92vw,26rem)]">
        <div className="absolute -inset-2 rounded-full bg-neon opacity-70 blur-md animate-ring" />
        <div
          key={spinKey + (busy ? "-busy" : "")}
          className={`relative grid size-full place-items-center rounded-full glass shadow-neon ${busy ? "animate-spin-x-loop" : spinKey ? "animate-spin-x" : ""}`}
          style={{ transformStyle: "preserve-3d" }}
        >
          <form onSubmit={submit} className="flex w-[72%] flex-col gap-3 text-center">
            <h1 className="text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create account"}</h1>
            {mode === "up" && (
              <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
            )}
            <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className={field} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <button disabled={busy} className="rounded-full bg-neon py-2.5 font-semibold text-primary-foreground shadow-neon transition hover:brightness-110 disabled:opacity-70">
              {mode === "in" ? "Log in" : "Sign up"}
            </button>
            <button type="button" onClick={google} className="rounded-full border border-input py-2 text-sm hover:bg-accent">
              Continue with Google
            </button>
            <button type="button" onClick={switchMode} className="text-xs text-muted-foreground hover:text-primary">
              {mode === "in" ? "New here? Sign up" : "Have an account? Log in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
