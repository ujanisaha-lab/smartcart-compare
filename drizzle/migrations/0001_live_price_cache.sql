CREATE TABLE public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_key text NOT NULL,
  store_id text NOT NULL,
  title text,
  price numeric,
  mrp numeric,
  in_stock boolean NOT NULL DEFAULT true,
  url text,
  image text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX price_snapshots_lookup ON public.price_snapshots (query_key, store_id, fetched_at DESC);
GRANT SELECT ON public.price_snapshots TO authenticated;
GRANT ALL ON public.price_snapshots TO service_role;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in users read prices" ON public.price_snapshots FOR SELECT TO authenticated USING (true);

CREATE TABLE public.search_cache (
  query_key text PRIMARY KEY,
  results jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.search_cache TO service_role;
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS product_title text;