import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export const alertsQuery = queryOptions({
  queryKey: ["price_alerts"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("price_alerts").select("id, product_id, target_price").limit(200);
    if (error) throw error;
    return (data ?? []).map((a) => ({ ...a, target_price: Number(a.target_price) }));
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

export async function setAlert(productId: string, target: number) {
  const id = await uid();
  const { error } = await supabase
    .from("price_alerts")
    .upsert({ user_id: id, product_id: productId, target_price: target }, { onConflict: "user_id,product_id" });
  if (error) throw error;
}

export async function removeAlert(alertId: string) {
  const { error } = await supabase.from("price_alerts").delete().eq("id", alertId);
  if (error) throw error;
}
