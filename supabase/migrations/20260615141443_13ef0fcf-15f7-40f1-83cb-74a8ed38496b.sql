
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  username text NOT NULL,
  real_name text,
  message text NOT NULL,
  reply text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  replied_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO anon, authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read support" ON public.support_messages FOR SELECT USING (true);
CREATE POLICY "public insert support" ON public.support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "public update support" ON public.support_messages FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete support" ON public.support_messages FOR DELETE USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
