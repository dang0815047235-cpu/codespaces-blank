
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  real_name text NOT NULL,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  score integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '🥚 Tế Bào Sơ Cấp',
  badges jsonb NOT NULL DEFAULT '["🧫"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read accounts" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "public insert accounts" ON public.accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "public update accounts" ON public.accounts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete accounts" ON public.accounts FOR DELETE USING (true);

DELETE FROM public.leaderboard_entries;
