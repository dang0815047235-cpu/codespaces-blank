
CREATE TABLE IF NOT EXISTS public.score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS score_history_user_time_idx ON public.score_history(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.score_history TO anon, authenticated;
GRANT ALL ON public.score_history TO service_role;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read score history" ON public.score_history FOR SELECT USING (true);
CREATE POLICY "public insert score history" ON public.score_history FOR INSERT WITH CHECK (true);
