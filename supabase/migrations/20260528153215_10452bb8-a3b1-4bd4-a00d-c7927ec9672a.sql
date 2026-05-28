
-- App settings (singleton)
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  music_url TEXT,
  music_title TEXT DEFAULT 'Nhạc nền hệ thống',
  pdf_url TEXT,
  pdf_name TEXT DEFAULT 'Tai_lieu.pdf',
  videos JSONB DEFAULT '[]'::jsonb,
  admin_password TEXT NOT NULL DEFAULT 'bionova2026',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "public update settings" ON public.app_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public insert settings" ON public.app_settings FOR INSERT WITH CHECK (true);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Leaderboard
CREATE TABLE public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  score INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '🥚 Tế Bào Sơ Cấp',
  badges JSONB NOT NULL DEFAULT '["🧫"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX leaderboard_score_idx ON public.leaderboard_entries (score DESC);

GRANT SELECT, INSERT, UPDATE ON public.leaderboard_entries TO anon, authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read lb" ON public.leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "public insert lb" ON public.leaderboard_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "public update lb" ON public.leaderboard_entries FOR UPDATE USING (true) WITH CHECK (true);

-- Seed ~80 fake users (top 100 sẽ bao gồm cả user thật)
INSERT INTO public.leaderboard_entries (username, score, title, badges)
SELECT
  'HV_' || lpad(n::text, 3, '0') || '_' || (ARRAY['Minh','An','Khoa','Bảo','Linh','Nhi','Phúc','Quân','Vy','Tú','Hà','Ngọc','Sơn','Trang','Huy','Lan','Đạt','Mai','Thư','Long'])[1 + (n % 20)],
  GREATEST(5, 90 - (n * 7 / 8))::int,
  CASE
    WHEN 90 - (n * 7 / 8) >= 78 THEN '🌟 Giáo Sư Phân Bào'
    WHEN 90 - (n * 7 / 8) >= 62 THEN '🏹 Chiến Binh Kì Sau II'
    WHEN 90 - (n * 7 / 8) >= 48 THEN '🧬 Kĩ Sư Trao Đổi Chéo'
    WHEN 90 - (n * 7 / 8) >= 32 THEN '🚦 Trưởng Tháp Checkpoint'
    WHEN 90 - (n * 7 / 8) >= 18 THEN '🧬 Thợ Săn Pha S'
    ELSE '🌱 Hợp Tử Sơ Sinh'
  END,
  '["🧫","🚦","🧪","🧬"]'::jsonb
FROM generate_series(1, 80) AS n;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "media public update" ON storage.objects FOR UPDATE USING (bucket_id = 'media');
CREATE POLICY "media public delete" ON storage.objects FOR DELETE USING (bucket_id = 'media');
