ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS default_videos jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.app_settings SET default_videos = '[
  {"id":"v1","title":"Chu kỳ tế bào (Cell Cycle) - Khan Academy","topic":"Chu kì tế bào","thumb":"🧫","duration":"08:42","url":"https://www.youtube.com/embed/Wy3N5NCZBHQ"},
  {"id":"v2","title":"Checkpoint điểm kiểm soát chu kỳ tế bào","topic":"Chu kì tế bào","thumb":"🚦","duration":"06:11","url":"https://www.youtube.com/embed/sYj5ki2JoTw"},
  {"id":"v3","title":"Ung thư - khi chu kỳ tế bào mất kiểm soát","topic":"Chu kì tế bào","thumb":"🔬","duration":"05:23","url":"https://www.youtube.com/embed/LEpTTolebqo"},
  {"id":"v4","title":"Nguyên phân (Mitosis) mô phỏng 3D","topic":"Nguyên phân","thumb":"📹","duration":"03:46","url":"https://www.youtube.com/embed/f-ldPgEfAHI"},
  {"id":"v5","title":"Các giai đoạn của Nguyên phân","topic":"Nguyên phân","thumb":"🧬","duration":"07:33","url":"https://www.youtube.com/embed/C6hn3sA0ip0"},
  {"id":"v6","title":"Phân chia tế bào chất Động vật vs Thực vật","topic":"Nguyên phân","thumb":"🌱","duration":"04:18","url":"https://www.youtube.com/embed/L0k-enzoeOM"},
  {"id":"v7","title":"Ý nghĩa của Nguyên phân","topic":"Nguyên phân","thumb":"🩹","duration":"05:02","url":"https://www.youtube.com/embed/NR0mdDJMHIQ"},
  {"id":"v8","title":"Giảm phân (Meiosis) Khan Academy","topic":"Giảm phân","thumb":"⚧","duration":"10:24","url":"https://www.youtube.com/embed/VzDMG7ke69g"},
  {"id":"v9","title":"Trao đổi chéo Crossing-over","topic":"Giảm phân","thumb":"🔀","duration":"04:55","url":"https://www.youtube.com/embed/h&#95;Yu6n4HmJ4"},
  {"id":"v10","title":"Phân li độc lập của NST","topic":"Giảm phân","thumb":"↔️","duration":"06:30","url":"https://www.youtube.com/embed/qCLmR9-YY7o"},
  {"id":"v11","title":"Giảm phân II tách chromatid chị em","topic":"Giảm phân","thumb":"✂️","duration":"05:48","url":"https://www.youtube.com/embed/lQiBKFe5VKw"},
  {"id":"v12","title":"So sánh Nguyên phân và Giảm phân","topic":"Tổng hợp","thumb":"⚖️","duration":"08:15","url":"https://www.youtube.com/embed/zGVBAHAsjJM"},
  {"id":"v13","title":"Sinh tinh và sinh trứng ở động vật","topic":"Giảm phân","thumb":"🥚","duration":"07:02","url":"https://www.youtube.com/embed/6vIPyy3JcMc"},
  {"id":"v14","title":"Nguyên phân - Giảm phân - Thụ tinh","topic":"Tổng hợp","thumb":"🔄","duration":"06:44","url":"https://www.youtube.com/embed/kaSIjIzAtYA"},
  {"id":"v15","title":"Bài tập tính số NST, Tâm động, Chromatid","topic":"Bài tập","thumb":"📝","duration":"12:30","url":"https://www.youtube.com/embed/IQJ4DBkCnco"}
]'::jsonb WHERE id = 1 AND (default_videos IS NULL OR jsonb_array_length(default_videos) = 0);