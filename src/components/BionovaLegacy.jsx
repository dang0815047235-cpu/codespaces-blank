import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import brandAsset from '@/assets/bionova-brand.png.asset.json';

// Trộn ngẫu nhiên mảng (Fisher–Yates) — dùng cho thứ tự câu hỏi & đáp án
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildShuffledQuiz(questions) {
  return questions.map((q) => ({
    ...q,
    options: shuffleArray(q.options),
  }));
}

// Gọi /api/chat ở chế độ streaming (SSE). onDelta nhận text tích lũy mỗi lần có token mới.
async function streamAiChat({ system, messages }, onDelta) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages }),
  });
  if (!res.ok || !res.body) {
    let errText = '';
    try { errText = await res.text(); } catch {}
    onDelta('⚠️ Lỗi AI: ' + (errText || res.status));
    return '';
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content
          ?? json?.choices?.[0]?.message?.content
          ?? '';
        if (delta) {
          full += delta;
          onDelta(full);
        }
      } catch {}
    }
  }
  return full;
}

function VideoAdminForm({ onUploadFile, onAddUrl }) {
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  return (
    <div className="space-y-2">
      <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Tiêu đề video" className="w-full bg-slate-900 border border-slate-800 px-2 py-1.5 rounded text-xs text-slate-100" />
      <div className="flex gap-2">
        <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="Dán URL video (mp4/youtube embed)" className="flex-1 bg-slate-900 border border-slate-800 px-2 py-1.5 rounded text-xs text-slate-100" />
        <button onClick={()=>{ if(title && url){ onAddUrl({title, url, thumb:'🎬', duration:'—', topic:'Admin'}); setTitle(''); setUrl(''); }}} className="px-3 py-1.5 bg-teal-500 text-slate-950 rounded text-xs font-bold">+ URL</button>
      </div>
      <label className="block">
        <span className="text-[10px] text-slate-400">Hoặc upload file video:</span>
        <input type="file" accept="video/*" onChange={(e)=>onUploadFile(e,{title: title || (e.target.files?.[0]?.name||'Video mới'), topic:'Admin'})} className="text-xs text-slate-300 block mt-1" />
      </label>
    </div>
  );
}

function isYouTubeUrl(u) {
  return typeof u === 'string' && /youtube\.com|youtu\.be/i.test(u);
}
function toYouTubeEmbed(u) {
  if (!u) return u;
  if (/youtube\.com\/embed\//.test(u)) return u;
  const m1 = u.match(/youtu\.be\/([\w-]+)/);
  if (m1) return `https://www.youtube.com/embed/${m1[1]}`;
  const m2 = u.match(/[?&]v=([\w-]+)/);
  if (m2) return `https://www.youtube.com/embed/${m2[1]}`;
  return u;
}

function DefaultVideoRow({ video, onSave, onDelete }) {
  const [v, setV] = React.useState(video);
  React.useEffect(() => setV(video), [video]);
  const dirty = JSON.stringify(v) !== JSON.stringify(video);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-1">
      <div className="flex gap-2">
        <input value={v.title} onChange={(e)=>setV({...v, title:e.target.value})} className="flex-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-xs text-slate-100" />
        <input value={v.topic} onChange={(e)=>setV({...v, topic:e.target.value})} className="w-24 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-xs text-slate-100" />
      </div>
      <div className="flex gap-2">
        <input value={v.url} onChange={(e)=>setV({...v, url:e.target.value})} placeholder="URL (YouTube/mp4)" className="flex-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[11px] text-slate-100" />
        <input value={v.thumb||''} onChange={(e)=>setV({...v, thumb:e.target.value})} className="w-12 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-xs text-slate-100" />
        <input value={v.duration||''} onChange={(e)=>setV({...v, duration:e.target.value})} className="w-16 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[11px] text-slate-100" />
        <button disabled={!dirty} onClick={()=>onSave(v)} className={`px-2 py-1 rounded text-[11px] font-bold ${dirty?'bg-teal-500 text-slate-950':'bg-slate-800 text-slate-500'}`}>💾</button>
        <button onClick={()=>onDelete(v.id)} className="px-2 py-1 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400">✕</button>
      </div>
    </div>
  );
}

// ==========================================================
// ĐẠI THƯ VIỆN 90 CÂU HỎI TRẮC NGHIỆM CHUYÊN SÂU BIONOVA LEGACY
// ==========================================================
const QUIZ_QUESTIONS = [
  // --- CHỦ ĐỀ 1: CHU KÌ TẾ BÀO (30 CÂU) ---
  { question: "Câu 1: Chu kì tế bào là gì?", options: ["Khoảng thời gian giữa 2 lần phân bào liên tiếp", "Thời gian tế bào sinh trưởng", "Thời gian phân chia nhân tế bào", "Khoảng thời gian từ khi sinh ra đến khi chết đi của tế bào"], answer: "Khoảng thời gian giữa 2 lần phân bào liên tiếp", topic: "Chu kì tế bào" },
  { question: "Câu 2: Chu kì tế bào bao gồm 2 giai đoạn chính nào?", options: ["Pha G1 và pha S", "Kì trung gian và quá trình nguyên phân", "Pha G2 và pha M", "Nguyên phân và giảm phân"], answer: "Kì trung gian và quá trình nguyên phân", topic: "Chu kì tế bào" },
  { question: "Câu 3: Ở tế bào nhân thực, kì trung gian chiếm khoảng bao nhiêu phần trăm thời gian của chu kì tế bào?", options: ["Khoảng 10%", "Khoảng 50%", "Khoảng 70%", "Hơn 90%"], answer: "Hơn 90%", topic: "Chu kì tế bào" },
  { question: "Câu 4: Kì trung gian được chia thành các pha theo thứ tự nào?", options: ["G1 → G2 → S", "S → G1 → G2", "G1 → S → G2", "G2 → S → G1"], answer: "G1 → S → G2", topic: "Chu kì tế bào" },
  { question: "Câu 5: Pha G1 có chức năng chủ yếu là gì?", options: ["Nhân đôi ADN", "Tế bào sinh trưởng, tổng hợp các chất", "Phân chia màng sinh chất", "Tạo thoi phân bào"], answer: "Tế bào sinh trưởng, tổng hợp các chất", topic: "Chu kì tế bào" },
  { question: "Câu 6: Sự nhân đôi của phân tử ADN và nhiễm sắc thể diễn ra ở pha nào?", options: ["Pha S", "Pha G1", "Pha G2", "Pha M"], answer: "Pha S", topic: "Chu kì tế bào" },
  { question: "Câu 7: Kết thúc pha S, mỗi nhiễm sắc thể gồm bao nhiêu chromatid (nhiễm sắc tử)?", options: ["1 chromatid", "2 chromatid", "4 chromatid", "Không có chromatid nào"], answer: "2 chromatid", topic: "Chu kì tế bào" },
  { question: "Câu 8: Ở pha G2, tế bào thực hiện hoạt động quan trọng nào?", options: ["Tổng hợp protein chuẩn bị cho phân bào (như tubulin)", "Nhân đôi trung thể", "Hình thành vách ngăn xenlulozo", "Phân li các NST về hai cực"], answer: "Tổng hợp protein chuẩn bị cho phân bào (như tubulin)", topic: "Chu kì tế bào" },
  { question: "Câu 9: Điểm kiểm soát (checkpoint) chu kì tế bào có vai trò gì?", options: ["Tăng tốc độ phân bào", "Kiểm tra và ngăn chặn các tế bào lỗi phân chia", "Giúp tế bào trao đổi chất nhanh hơn", "Sản sinh năng lượng ATP"], answer: "Kiểm tra và ngăn chặn các tế bào lỗi phân chia", topic: "Chu kì tế bào" },
  { question: "Câu 10: Tế bào sẽ đi vào trạng thái nghỉ ngơi (pha G0) và ngừng phân chia nếu không qua được điểm kiểm soát nào?", options: ["Điểm kiểm soát G2/M", "Điểm kiểm soát thoi phân bào (M)", "Điểm kiểm soát G1", "Điểm kiểm soát pha S"], answer: "Điểm kiểm soát G1", topic: "Chu kì tế bào" },
  { question: "Câu 11: Nếu hệ thống kiểm soát chu kì tế bào bị hỏng và tế bào phân chia mất kiểm soát, hậu quả là gì?", options: ["Tế bào sẽ lớn lên vô hạn", "Tế bào sẽ tự tiêu hủy ngay lập tức", "Hình thành khối u (bệnh ung thư)", "Tế bào sẽ tiến hành giảm phân"], answer: "Hình thành khối u (bệnh ung thư)", topic: "Chu kì tế bào" },
  { question: "Câu 12: Gen p53 thường được gọi là 'vệ sĩ của hệ gen' vì nó có vai trò gì trong chu kì tế bào?", options: ["Kích thích tế bào phân chia", "Dừng chu kì tế bào để sửa lỗi ADN hoặc kích hoạt apoptosis", "Tổng hợp ADN mới", "Tạo ra thoi phân bào"], answer: "Dừng chu kì tế bào để sửa lỗi ADN hoặc kích hoạt apoptosis", topic: "Chu kì tế bào" },
  { question: "Câu 13: Hiện tượng Apoptosis trong chu kì tế bào là gì?", options: ["Sự phân chia tế bào chất", "Sự nhân đôi ADN", "Sự tự chết theo chương trình của tế bào", "Sự trao đổi chéo giữa các gen"], answer: "Sự tự chết theo chương trình của tế bào", topic: "Chu kì tế bào" },
  { question: "Câu 14: Loại protein nào đóng vai trò như 'động cơ' thúc đẩy chu kì tế bào tiến lên?", options: ["Hemoglobin", "Cyclin và Cdk (Cyclin-dependent kinase)", "Keratin", "Actin và Myosin"], answer: "Cyclin và Cdk (Cyclin-dependent kinase)", topic: "Chu kì tế bào" },
  { question: "Câu 15: Thời gian của chu kì tế bào phụ thuộc vào yếu tố nào?", options: ["Nhiệt độ môi trường", "Chỉ phụ thuộc vào kích thước tế bào", "Loài sinh vật và loại tế bào", "Lượng nước trong cơ thể"], answer: "Loài sinh vật và loại tế bào", topic: "Chu kì tế bào" },
  { question: "Câu 16: Tế bào nào sau đây ở người trưởng thành hầu như không phân chia (dừng ở pha G0)?", options: ["Tế bào da", "Tế bào niêm mạc ruột", "Tế bào tủy xương", "Tế bào thần kinh"], answer: "Tế bào thần kinh", topic: "Chu kì tế bào" },
  { question: "Câu 17: Ở ruồi giấm, chu kì phân cắt của phôi giai đoạn đầu chỉ diễn ra khoảng 10-15 phút vì chúng bỏ qua pha nào?", options: ["Pha S và G2", "Pha G1 và G2", "Pha M và G1", "Pha S và M"], answer: "Pha G1 và G2", topic: "Chu kì tế bào" },
  { question: "Câu 18: Tế bào đang ở đầu pha G1 có hàm lượng ADN trong nhân là 2c. Ở cuối pha G2, hàm lượng ADN là bao nhiêu?", options: ["c", "2c", "4c", "8c"], answer: "4c", topic: "Chu kì tế bào" },
  { question: "Câu 19: Khối u ác tính khác biệt với khối u lành tính ở đặc điểm cơ bản nào?", options: ["Phát triển chậm hơn", "Có khả năng tách khỏi mô ban đầu và di căn", "Chứa ít mạch máu hơn", "Các tế bào có kích thước nhỏ hơn"], answer: "Có khả năng tách khỏi mô ban đầu và di căn", topic: "Chu kì tế bào" },
  { question: "Câu 20: Hai chromatid chị em được gắn nối với nhau tại một eo thắt gọi là gì?", options: ["Tâm động (Centromere)", "Trung thể (Centrosome)", "Telomere", "Sợi nhiễm sắc"], answer: "Tâm động (Centromere)", topic: "Chu kì tế bào" },
  { question: "Câu 21: Chất hóa học Colchicine gây ức chế hình thành vi ống, nếu sử dụng thì chu kì tế bào sẽ bị dừng ở pha/kì nào?", options: ["Pha G1", "Pha S", "Kì giữa của nguyên phân", "Pha G2"], answer: "Kì giữa của nguyên phân", topic: "Chu kì tế bào" },
  { question: "Câu 22: Điểm kiểm soát thoi phân bào (M checkpoint) kiểm tra yếu tố nào?", options: ["ADN đã nhân đôi xong chưa", "Kích thước tế bào đủ lớn chưa", "Tất cả các NST đã đính vào thoi phân bào chưa", "Màng nhân đã tiêu biến chưa"], answer: "Tất cả các NST đã đính vào thoi phân bào chưa", topic: "Chu kì tế bào" },
  { question: "Câu 23: Tế bào ung thư thường có khả năng vô hạn trong việc phân chia nhờ có enzyme nào?", options: ["Amylase", "Telomerase", "Helicase", "Lipase"], answer: "Telomerase", topic: "Chu kì tế bào" },
  { question: "Câu 24: Một tế bào lưỡng bội của người có 46 NST. Số lượng chromatid ở pha G1 là bao nhiêu?", options: ["23", "46", "92", "0"], answer: "0", topic: "Chu kì tế bào" },
  { question: "Câu 25: Cùng một tế bào người 46 NST trên, số chromatid ở pha G2 là bao nhiêu?", options: ["46", "92", "23", "0"], answer: "92", topic: "Chu kì tế bào" },
  { question: "Câu 26: Trung thể ở tế bào động vật nhân đôi ở pha nào của chu kì tế bào?", options: ["Pha G1", "Pha S", "Pha G2", "Pha M"], answer: "Pha S", topic: "Chu kì tế bào" },
  { question: "Câu 27: Hoạt động tổng hợp ARN diễn ra mạnh mẽ nhất ở các pha nào?", options: ["Pha G1 và G2", "Chỉ ở pha S", "Pha M", "Toàn bộ chu kì tế bào với cường độ bằng nhau"], answer: "Pha G1 và G2", topic: "Chu kì tế bào" },
  { question: "Câu 28: Sự khác biệt cơ bản giữa phân bào ở vi khuẩn (nhân sơ) và sinh vật nhân thực là gì?", options: ["Vi khuẩn không có chu kì tế bào", "Vi khuẩn phân đôi trực tiếp, không hình thành thoi phân bào", "Vi khuẩn chỉ có pha S và G2", "Vi khuẩn tiến hành giảm phân"], answer: "Vi khuẩn phân đôi trực tiếp, không hình thành thoi phân bào", topic: "Chu kì tế bào" },
  { question: "Câu 29: Nếu tế bào nhận tín hiệu từ các yếu tố sinh trưởng bên ngoài (Growth factors), nó sẽ vượt qua điểm kiểm soát nào để tiếp tục phân chia?", options: ["Điểm M", "Điểm G2", "Điểm G1", "Tất cả các điểm"], answer: "Điểm G1", topic: "Chu kì tế bào" },
  { question: "Câu 30: Sự đóng xoắn của nhiễm sắc thể bắt đầu mạnh mẽ nhất khi tế bào chuyển từ pha nào sang pha nào?", options: ["Từ G1 sang S", "Từ S sang G2", "Từ G2 sang pha M", "Từ kì giữa sang kì sau"], answer: "Từ G2 sang pha M", topic: "Chu kì tế bào" },

  // --- CHỦ ĐỀ 2: NGUYÊN PHÂN (30 CÂU) ---
  { question: "Câu 31: Nguyên phân (Mitosis) là hình thức phân bào xảy ra chủ yếu ở loại tế bào nào?", options: ["Tế bào sinh dục chín", "Tế bào xôma và tế bào sinh dục sơ khai", "Tế bào vi khuẩn", "Giao tử"], answer: "Tế bào xôma và tế bào sinh dục sơ khai", topic: "Nguyên phân" },
  { question: "Câu 32: Nguyên phân được chia làm mấy kì chính?", options: ["2 kì", "3 kì", "4 kì", "5 kì"], answer: "4 kì", topic: "Nguyên phân" },
  { question: "Câu 33: Thứ tự đúng của các kì trong quá trình nguyên phân là gì?", options: ["Kì đầu, kì giữa, kì sau, kì cuối", "Kì giữa, kì đầu, kì sau, kì cuối", "Kì đầu, kì sau, kì giữa, kì cuối", "Kì sau, kì cuối, kì giữa, kì đầu"], answer: "Kì đầu, kì giữa, kì sau, kì cuối", topic: "Nguyên phân" },
  { question: "Câu 34: Ở kì đầu của nguyên phân, nhiễm sắc thể có đặc điểm gì?", options: ["Tháo xoắn hoàn toàn", "Bắt đầu co xoắn lại", "Tách thành 2 NST đơn", "Xếp thành hàng ở xích đạo"], answer: "Bắt đầu co xoắn lại", topic: "Nguyên phân" },
  { question: "Câu 35: Màng nhân và nhân con tiêu biến hoàn toàn ở kì nào?", options: ["Kì đầu", "Kì giữa", "Kì sau", "Kì cuối"], answer: "Kì đầu", topic: "Nguyên phân" },
  { question: "Câu 36: Thoi phân bào bắt đầu được hình thành từ hai cực của tế bào ở kì nào?", options: ["Kì đầu", "Kì giữa", "Kì sau", "Kì cuối"], answer: "Kì đầu", topic: "Nguyên phân" },
  { question: "Câu 37: Đặc điểm nổi bật nhất của NST ở kì giữa nguyên phân là gì?", options: ["Tách tâm động", "Co xoắn cực đại và xếp thành 1 hàng trên mặt phẳng xích đạo", "Tập trung về 2 cực của tế bào", "Bắt đầu tháo xoắn"], answer: "Co xoắn cực đại và xếp thành 1 hàng trên mặt phẳng xích đạo", topic: "Nguyên phân" },
  { question: "Câu 38: Vi ống của thoi phân bào đính vào vị trí nào của NST?", options: ["Đầu mút (Telomere)", "Đoạn giữa của mỗi chromatid", "Tâm động (Kinetochore)", "Bất kì vị trí nào trên ADN"], answer: "Tâm động (Kinetochore)", topic: "Nguyên phân" },
  { question: "Câu 39: Ở kì sau nguyên phân, sự kiện quan trọng nào xảy ra?", options: ["Màng nhân xuất hiện trở lại", "Hai chromatid chị em tách nhau ở tâm động và di chuyển về hai cực", "NST tiếp tục nhân đôi", "Tế bào chất chia đôi"], answer: "Hai chromatid chị em tách nhau ở tâm động và di chuyển về hai cực", topic: "Nguyên phân" },
  { question: "Câu 40: Trạng thái của NST ở kì sau nguyên phân là gì?", options: ["Nhiễm sắc thể kép", "Nhiễm sắc thể đơn", "Sợi nhiễm sắc", "Sợi siêu xoắn"], answer: "Nhiễm sắc thể đơn", topic: "Nguyên phân" },
  { question: "Câu 41: Kì cuối của nguyên phân đánh dấu sự kiện nào?", options: ["NST co xoắn cực đại", "Thoi phân bào hình thành", "Màng nhân, nhân con tái xuất hiện và NST tháo xoắn", "Tâm động bắt đầu tách"], answer: "Màng nhân, nhân con tái xuất hiện và NST tháo xoắn", topic: "Nguyên phân" },
  { question: "Câu 42: Ở tế bào động vật, sự phân chia tế bào chất diễn ra bằng cơ chế nào?", options: ["Tạo vách ngăn (cell plate) từ trung tâm", "Thắt eo màng sinh chất từ ngoài vào trong", "Phân giải màng tế bào", "Tế bào mẹ nổ tung để giải phóng 2 tế bào con"], answer: "Thắt eo màng sinh chất từ ngoài vào trong", topic: "Nguyên phân" },
  { question: "Câu 43: Ở tế bào thực vật, sự phân chia tế bào chất diễn ra bằng cơ chế nào?", options: ["Thắt rãnh phân cắt", "Hình thành vách ngăn xenlulozo từ trung tâm lan ra màng", "Màng sinh chất tự cuộn lại", "Làm tan biến thành tế bào cũ"], answer: "Hình thành vách ngăn xenlulozo từ trung tâm lan ra màng", topic: "Nguyên phân" },
  { question: "Câu 44: Kết quả của một quá trình nguyên phân bình thường từ 1 tế bào mẹ (2n) là gì?", options: ["4 tế bào con mang bộ NST n", "2 tế bào con mang bộ NST n", "2 tế bào con có bộ NST 2n giống hệt tế bào mẹ", "1 tế bào lớn mang bộ NST 4n"], answer: "2 tế bào con có bộ NST 2n giống hệt tế bào mẹ", topic: "Nguyên phân" },
  { question: "Câu 45: Đối với sinh vật đa bào, nguyên phân mang ý nghĩa gì?", options: ["Tạo ra giao tử để sinh sản", "Tạo biến dị tổ hợp", "Giúp cơ thể sinh trưởng, phát triển và tái tạo mô bị tổn thương", "Giảm một nửa số lượng NST"], answer: "Giúp cơ thể sinh trưởng, phát triển và tái tạo mô bị tổn thương", topic: "Nguyên phân" },
  { question: "Câu 46: Đối với sinh vật đơn bào nhân thực (như amip, trùng đế giày), nguyên phân là cơ chế của quá trình nào?", options: ["Sinh sản hữu tính", "Sinh sản vô tính", "Tiêu hóa nội bào", "Hô hấp tế bào"], answer: "Sinh sản vô tính", topic: "Nguyên phân" },
  { question: "Câu 47: Ứng dụng thực tiễn của nguyên phân trong nông nghiệp là gì?", options: ["Tạo giống lai mới", "Gây đột biến gen", "Nuôi cấy mô, giâm cành, chiết cành", "Tạo giao tử vô trùng"], answer: "Nuôi cấy mô, giâm cành, chiết cành", topic: "Nguyên phân" },
  { question: "Câu 48: Một tế bào có 2n = 14 tiến hành nguyên phân. Ở kì giữa, trong tế bào có bao nhiêu NST và ở trạng thái nào?", options: ["14 NST đơn", "14 NST kép", "28 NST đơn", "7 NST kép"], answer: "14 NST kép", topic: "Nguyên phân" },
  { question: "Câu 49: Với tế bào 2n = 14 trên, ở kì giữa có bao nhiêu chromatid?", options: ["14", "28", "0", "7"], answer: "28", topic: "Nguyên phân" },
  { question: "Câu 50: Vẫn tế bào 2n = 14, ở kì sau nguyên phân trong tế bào có bao nhiêu NST đơn?", options: ["14 NST đơn", "28 NST đơn", "7 NST đơn", "56 NST đơn"], answer: "28 NST đơn", topic: "Nguyên phân" },
  { question: "Câu 51: Trong kì đầu nguyên phân ở tế bào người (2n=46), số lượng phân tử ADN là bao nhiêu?", options: ["46", "92", "23", "184"], answer: "92", topic: "Nguyên phân" },
  { question: "Câu 52: Tế bào thực vật bậc cao không có trung thể, vậy thoi phân bào được hình thành từ đâu?", options: ["Từ màng nhân", "Từ các vi ống ở vùng quanh nhân", "Từ bộ máy Golgi", "Từ lục lạp"], answer: "Từ các vi ống ở vùng quanh nhân", topic: "Nguyên phân" },
  { question: "Câu 53: Nếu sự hình thành thoi phân bào bị ức chế hoàn toàn (do hóa chất) nhưng quá trình nhân đôi ADN vẫn diễn ra, kết quả là gì?", options: ["Tạo ra tế bào n", "Tạo ra tế bào tứ bội 4n (đột biến đa bội)", "Tế bào bị teo nhỏ lại", "Tế bào vẫn tách thành 2 tế bào con 2n"], answer: "Tạo ra tế bào tứ bội 4n (đột biến đa bội)", topic: "Nguyên phân" },
  { question: "Câu 54: Vì sao việc NST co xoắn cực đại ở kì giữa lại có ý nghĩa sinh học quan trọng?", options: ["Để dễ phân ly về 2 cực mà không bị rối loạn, đứt gãy", "Để tiết kiệm năng lượng", "Để tăng diện tích tiếp xúc với thoi phân bào", "Để thực hiện phiên mã ADN nhanh hơn"], answer: "Để dễ phân ly về 2 cực mà không bị rối loạn, đứt gãy", topic: "Nguyên phân" },
  { question: "Câu 55: Từ 1 tế bào mẹ ban đầu, trải qua 5 lần nguyên phân liên tiếp sẽ tạo ra bao nhiêu tế bào con?", options: ["5", "10", "16", "32"], answer: "32", topic: "Nguyên phân" },
  { question: "Câu 56: Có 3 tế bào mẹ cùng tiến hành nguyên phân 4 lần liên tiếp. Số lượng tế bào con thu được là?", options: ["12", "48", "64", "81"], answer: "48", topic: "Nguyên phân" },
  { question: "Câu 57: Vách ngăn (cell plate) ở tế bào thực vật có bản chất là các bọng chứa pectin và xenlulozo được hình thành từ bào quan nào?", options: ["Ti thể", "Lục lạp", "Bộ máy Golgi", "Không bào"], answer: "Bộ máy Golgi", topic: "Nguyên phân" },
  { question: "Câu 58: Nếu 1 tế bào ở người bị mất hoàn toàn khả năng ức chế tiếp xúc và ức chế phụ thuộc mật độ, hiện tượng này đặc trưng cho quá trình nào?", options: ["Liền sẹo", "Sự lớn lên bình thường", "Nguyên phân ở mô phân sinh", "Hình thành khối u ung thư"], answer: "Hình thành khối u ung thư", topic: "Nguyên phân" },
  { question: "Câu 59: Động lực kéo các chromatid chị em về 2 cực tế bào ở kì sau là gì?", options: ["Sự tháo xoắn của NST", "Sự ngắn lại (co rút) của các vi ống tâm động", "Lực đẩy từ mặt phẳng xích đạo", "Áp suất thẩm thấu của tế bào chất"], answer: "Sự ngắn lại (co rút) của các vi ống tâm động", topic: "Nguyên phân" },
  { question: "Câu 60: Ở kì cuối nguyên phân, sự phân chia tế bào chất kết thúc sẽ hình thành nên 2 tế bào con. Nhận định nào sau đây là SAI?", options: ["Bộ NST của 2 tế bào con giống nhau", "Bộ NST của tế bào con giống hệt tế bào mẹ", "Tế bào con mang bộ NST kép", "Tế bào con có bộ NST lưỡng bội 2n"], answer: "Tế bào con mang bộ NST kép", topic: "Nguyên phân" },

  // --- CHỦ ĐỀ 3: GIẢM PHÂN (30 CÂU) ---
  { question: "Câu 61: Quá trình giảm phân (Meiosis) xảy ra ở loại tế bào nào?", options: ["Tế bào xôma", "Tế bào sinh dục sơ khai", "Tế bào sinh dục chín (tế bào sinh tinh/sinh trứng)", "Tế bào hợp tử"], answer: "Tế bào sinh dục chín (tế bào sinh tinh/sinh trứng)", topic: "Giảm phân" },
  { question: "Câu 62: Quá trình giảm phân bao gồm mấy lần phân bào liên tiếp?", options: ["1 lần", "2 lần", "3 lần", "4 lần"], answer: "2 lần", topic: "Giảm phân" },
  { question: "Câu 63: Sự nhân đôi của phân tử ADN và nhiễm sắc thể diễn ra vào lúc nào trong giảm phân?", options: ["Pha S trước khi vào Giảm phân I", "Pha S giữa Giảm phân I và Giảm phân II", "Kì đầu của Giảm phân I", "Kì đầu của Giảm phân II"], answer: "Pha S trước khi vào Giảm phân I", topic: "Giảm phân" },
  { question: "Câu 64: Đặc điểm nổi bật nhất và có ý nghĩa di truyền to lớn diễn ra ở Kì đầu I của giảm phân là gì?", options: ["Màng nhân biến mất", "Sự hình thành thoi phân bào", "Sự tiếp hợp và trao đổi chéo (Crossing-over) giữa các chromatid khác nguồn gốc", "Sự co xoắn của NST"], answer: "Sự tiếp hợp và trao đổi chéo (Crossing-over) giữa các chromatid khác nguồn gốc", topic: "Giảm phân" },
  { question: "Câu 65: Sự trao đổi chéo ở kì đầu I diễn ra giữa các cấu trúc nào?", options: ["Giữa 2 chromatid chị em của 1 NST kép", "Giữa 2 chromatid không chị em thuộc cặp NST tương đồng", "Giữa 2 NST không tương đồng", "Giữa NST và thoi phân bào"], answer: "Giữa 2 chromatid không chị em thuộc cặp NST tương đồng", topic: "Giảm phân" },
  { question: "Câu 66: Ý nghĩa sinh học của hiện tượng trao đổi chéo là gì?", options: ["Làm tăng tốc độ phân bào", "Tạo ra các biến dị tổ hợp, tăng tính đa dạng di truyền", "Bảo tồn nguyên vẹn thông tin di truyền", "Ngăn chặn sự đột biến gen"], answer: "Tạo ra các biến dị tổ hợp, tăng tính đa dạng di truyền", topic: "Giảm phân" },
  { question: "Câu 67: Ở kì giữa I của giảm phân, các nhiễm sắc thể sắp xếp như thế nào trên mặt phẳng xích đạo?", options: ["Xếp thành 1 hàng", "Xếp thành 2 hàng song song", "Phân tán tự do", "Chỉ tập trung ở 2 cực"], answer: "Xếp thành 2 hàng song song", topic: "Giảm phân" },
  { question: "Câu 68: Trong kì sau I của giảm phân, hiện tượng phân li diễn ra như thế nào?", options: ["Các chromatid chị em tách nhau ra", "Toàn bộ NST dồn về 1 cực", "Mỗi NST kép trong cặp tương đồng phân li độc lập về một cực", "Tâm động tách làm đôi"], answer: "Mỗi NST kép trong cặp tương đồng phân li độc lập về một cực", topic: "Giảm phân" },
  { question: "Câu 69: Hiện tượng phân li độc lập của các cặp NST tương đồng ở kì sau I là cơ sở tế bào học của quy luật di truyền nào?", options: ["Quy luật phân li của Mendel", "Quy luật phân li độc lập của Mendel", "Liên kết gen", "Di truyền ngoài nhân"], answer: "Quy luật phân li độc lập của Mendel", topic: "Giảm phân" },
  { question: "Câu 70: Kết thúc Giảm phân I, từ 1 tế bào mẹ 2n tạo ra được gì?", options: ["2 tế bào con có bộ NST n kép", "2 tế bào con có bộ NST n đơn", "4 tế bào con có bộ NST n đơn", "2 tế bào con có bộ NST 2n đơn"], answer: "2 tế bào con có bộ NST n kép", topic: "Giảm phân" },
  { question: "Câu 71: Có sự nhân đôi ADN giữa Giảm phân I và Giảm phân II không?", options: ["Có, diễn ra nhanh", "Có, nhân đôi toàn bộ", "Không có sự nhân đôi ADN nào", "Có, nhưng chỉ nhân đôi tâm động"], answer: "Không có sự nhân đôi ADN nào", topic: "Giảm phân" },
  { question: "Câu 72: Bản chất của Giảm phân II diễn ra gần giống hoàn toàn với quá trình nào?", options: ["Kì trung gian", "Giảm phân I", "Nguyên phân", "Thụ tinh"], answer: "Nguyên phân", topic: "Giảm phân" },
  { question: "Câu 73: Ở kì giữa II của giảm phân, các nhiễm sắc thể sắp xếp như thế nào?", options: ["Thành 2 hàng NST kép", "Thành 1 hàng NST đơn", "Thành 1 hàng NST kép", "Thành 2 hàng NST đơn"], answer: "Thành 1 hàng NST kép", topic: "Giảm phân" },
  { question: "Câu 74: Trong kì sau II của giảm phân, cấu trúc nào bị kéo về 2 cực của tế bào?", options: ["Các NST tương đồng", "Các chromatid chị em tách nhau ra thành các NST đơn", "Toàn bộ bộ nhân", "Chỉ các gen trao đổi chéo"], answer: "Các chromatid chị em tách nhau ra thành các NST đơn", topic: "Giảm phân" },
  { question: "Câu 75: Kết quả cuối cùng của toàn bộ quá trình Giảm phân từ 1 tế bào sinh dục mẹ ban đầu là gì?", options: ["2 tế bào con 2n", "4 tế bào con 2n", "2 tế bào con n", "4 tế bào con mang bộ NST đơn bội (n)"], answer: "4 tế bào con mang bộ NST đơn bội (n)", topic: "Giảm phân" },
  { question: "Câu 76: Ở động vật đực, từ 1 tế bào sinh tinh qua giảm phân sẽ tạo ra kết quả gì?", options: ["1 tinh trùng và 3 thể cực", "4 tinh trùng có kích thước bằng nhau", "2 tinh trùng 2n", "1 tinh trùng khổng lồ"], answer: "4 tinh trùng có kích thước bằng nhau", topic: "Giảm phân" },
  { question: "Câu 77: Ở động vật cái, từ 1 tế bào sinh trứng qua giảm phân sẽ tạo ra kết quả gì?", options: ["4 trứng có khả năng thụ tinh", "1 tế bào trứng lớn và 3 thể cực nhỏ (sẽ tiêu biến)", "2 trứng và 2 thể cực", "1 trứng n và 1 thể cực 2n"], answer: "1 tế bào trứng lớn và 3 thể cực nhỏ (sẽ tiêu biến)", topic: "Giảm phân" },
  { question: "Câu 78: Thể cực (Polar body) sinh ra trong quá trình tạo trứng có chức năng gì?", options: ["Thụ tinh để tạo thai đôi", "Dự trữ chất dinh dưỡng cho trứng", "Chỉ để loại bỏ bớt NST, sau đó tiêu biến", "Phát triển thành rau thai"], answer: "Chỉ để loại bỏ bớt NST, sau đó tiêu biến", topic: "Giảm phân" },
  { question: "Câu 79: Sự đa dạng của các loại giao tử được tạo ra là do các cơ chế nào phối hợp?", options: ["Nguyên phân và nhân đôi ADN", "Sự trao đổi chéo ở kì đầu I và sự phân li ngẫu nhiên ở kì sau I", "Sự tách tâm động ở kì sau II", "Sự co xoắn NST"], answer: "Sự trao đổi chéo ở kì đầu I và sự phân li ngẫu nhiên ở kì sau I", topic: "Giảm phân" },
  { question: "Câu 80: Một loài có bộ NST 2n = 8 (như ruồi giấm). Ở kì sau của Giảm phân I, trong mỗi tế bào có bao nhiêu NST và ở trạng thái nào?", options: ["8 NST kép", "4 NST kép ở mỗi cực (tổng cộng 8 NST kép trong tế bào)", "16 NST đơn", "8 NST đơn"], answer: "4 NST kép ở mỗi cực (tổng cộng 8 NST kép trong tế bào)", topic: "Giảm phân" },
  { question: "Câu 81: Vẫn loài có 2n = 8 trên, ở kì sau của Giảm phân II, trong tế bào đang phân chia có bao nhiêu NST đơn?", options: ["4", "8", "16", "2"], answer: "8", topic: "Giảm phân" },
  { question: "Câu 82: Một cơ thể đực có kiểu gen AaBb (các gen phân li độc lập). Không có đột biến, cơ thể này qua giảm phân tạo ra tối đa bao nhiêu loại giao tử (tinh trùng)?", options: ["2 loại", "4 loại", "8 loại", "16 loại"], answer: "4 loại", topic: "Giảm phân" },
  { question: "Câu 83: Có 10 tế bào sinh trứng tham gia giảm phân bình thường. Số lượng trứng thu được là bao nhiêu?", options: ["10", "20", "30", "40"], answer: "10", topic: "Giảm phân" },
  { question: "Câu 84: Có 10 tế bào sinh tinh tham gia giảm phân bình thường. Số lượng tinh trùng thu được là bao nhiêu?", options: ["10", "20", "30", "40"], answer: "40", topic: "Giảm phân" },
  { question: "Câu 85: Sự kiện 'Chiasmata' (các điểm bắt chéo) quan sát được dưới kính hiển vi ở Kì đầu I là biểu hiện tế bào học của hiện tượng gì?", options: ["Sự tháo xoắn của NST", "Sự trao đổi chéo", "Sự phân chia tế bào chất", "Sự nhân đôi trung thể"], answer: "Sự trao đổi chéo", topic: "Giảm phân" },
  { question: "Câu 86: Nếu có sự không phân li của 1 cặp NST tương đồng ở Giảm phân I, kết quả tạo ra các giao tử có bộ NST như thế nào?", options: ["Toàn bộ giao tử n", "Giao tử n+1 và giao tử n-1", "Giao tử 2n và giao tử 0", "Toàn bộ giao tử 2n"], answer: "Giao tử n+1 và giao tử n-1", topic: "Giảm phân" },
  { question: "Câu 87: Điểm khác biệt quan trọng nhất giữa Giảm phân II và Nguyên phân là gì?", options: ["NST ở Kì giữa II không xếp hàng", "Sự phân li chromatid không xảy ra", "Tế bào bước vào Giảm phân II mang bộ NST đơn bội kép (n kép) thay vì lưỡng bội kép (2n kép)", "Không có sự hình thành thoi phân bào"], answer: "Tế bào bước vào Giảm phân II mang bộ NST đơn bội kép (n kép) thay vì lưỡng bội kép (2n kép)", topic: "Giảm phân" },
  { question: "Câu 88: Một tế bào mẹ có 2n = 46. Số tâm động có trong tế bào ở Kì giữa I của giảm phân là bao nhiêu?", options: ["23", "46", "92", "0"], answer: "46", topic: "Giảm phân" },
  { question: "Câu 89: Một tế bào mẹ có 2n = 46. Số chromatid có trong tế bào ở Kì giữa I của giảm phân là bao nhiêu?", options: ["46", "92", "23", "184"], answer: "92", topic: "Giảm phân" },
  { question: "Câu 90: Quá trình nào phối hợp cùng với giảm phân để duy trì bộ NST đặc trưng của các loài sinh sản hữu tính qua các thế hệ?", options: ["Sự sinh trưởng và phát triển", "Sự trao đổi chất", "Quá trình thụ tinh", "Sự đột biến nhiễm sắc thể"], answer: "Quá trình thụ tinh", topic: "Giảm phân" }
];

const VIDEOS_LIST = [
  { id: 'v1', title: 'Tổng quan về Chu kì tế bào & Kì trung gian', duration: '12:05', topic: 'Chu kì tế bào', thumb: '🧫', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'v2', title: 'Hoạt động của các Checkpoint (Điểm kiểm soát)', duration: '08:30', topic: 'Chu kì tế bào', thumb: '🚦', url: 'https://file-examples.com/storage/fe2c0d738c6652140d7c7fa/2017/04/file_example_MP4_480_1_MG.mp4' },
  { id: 'v3', title: 'Ung thư: Khi chu kì tế bào mất kiểm soát', duration: '15:20', topic: 'Chu kì tế bào', thumb: '🔬', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'v4', title: 'Mô phỏng 3D diễn biến các kì Nguyên phân', duration: '10:15', topic: 'Nguyên phân', thumb: '📹', url: 'https://file-examples.com/storage/fe2c0d738c6652140d7c7fa/2017/04/file_example_MP4_480_1_MG.mp4' },
  { id: 'v5', title: 'Sự hình thành thoi phân bào & Tâm động', duration: '06:45', topic: 'Nguyên phân', thumb: '🧬', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'v6', title: 'So sánh phân chia tế bào chất: Động vật vs Thực vật', duration: '09:10', topic: 'Nguyên phân', thumb: '🌱', url: 'https://file-examples.com/storage/fe2c0d738c6652140d7c7fa/2017/04/file_example_MP4_480_1_MG.mp4' },
  { id: 'v7', title: 'Ý nghĩa của Nguyên phân trong tái tạo mô', duration: '07:25', topic: 'Nguyên phân', thumb: '🩹', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'v8', title: 'Tổng quan Giảm phân & Sự hình thành giao tử', duration: '14:50', topic: 'Giảm phân', thumb: '⚧', url: 'https://file-examples.com/storage/fe2c0d738c6652140d7c7fa/2017/04/file_example_MP4_480_1_MG.mp4' },
  { id: 'v9', title: 'Hiện tượng trao đổi chéo ở Kì đầu I (Crossing-over)', duration: '11:30', topic: 'Giảm phân', thumb: '🔀', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'v10', title: 'Phân li độc lập của NST ở Kì sau I', duration: '08:15', topic: 'Giảm phân', thumb: '↔️', url: 'https://file-examples.com/storage/fe2c0d738c6652140d7c7fa/2017/04/file_example_MP4_480_1_MG.mp4' },
  { id: 'v11', title: 'Giảm phân II: Sự tách chromatid chị em', duration: '09:40', topic: 'Giảm phân', thumb: '✂️', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'v12', title: 'So sánh chi tiết Nguyên phân và Giảm phân', duration: '18:00', topic: 'Tổng hợp', thumb: '⚖️', url: 'https://file-examples.com/storage/fe2c0d738c6652140d7c7fa/2017/04/file_example_MP4_480_1_MG.mp4' },
  { id: 'v13', title: 'Quá trình sinh tinh và sinh trứng ở động vật', duration: '13:20', topic: 'Giảm phân', thumb: '🥚', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'v14', title: 'Mối liên hệ: Nguyên phân - Giảm phân - Thụ tinh', duration: '16:45', topic: 'Tổng hợp', thumb: '🔄', url: 'https://file-examples.com/storage/fe2c0d738c6652140d7c7fa/2017/04/file_example_MP4_480_1_MG.mp4' },
  { id: 'v15', title: 'Bài tập tính số lượng NST, Tâm động, Chromatid', duration: '22:10', topic: 'Bài tập', thumb: '📝', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
];

// 🏆 HỆ THỐNG 15 HUY HIỆU ĐỒ SỘ ĐẠT ĐƯỢC
const BADGES_LIST = [
  { id: 'b1', name: '🧫 Màng Sinh Chất', desc: 'Đăng ký tài khoản thành công', icon: '🧫' },
  { id: 'b2', name: '🚦 Điểm Kiểm Soát', desc: 'Đạt từ 5 câu đúng trở lên', icon: '🚦' },
  { id: 'b3', name: '🧪 Sợi Nhiễm Sắc', desc: 'Đạt từ 12 câu đúng trở lên', icon: '🧪' },
  { id: 'b4', name: '🧬 Khởi Nguyên Kép', desc: 'Đạt từ 20 câu đúng trở lên', icon: '🧬' },
  { id: 'b5', name: '🔄 Bậc Thầy Kì Trung Gian', desc: 'Đạt từ 30 câu đúng trở lên', icon: '🔄' },
  { id: 'b6', name: '🎬 Phá Vỡ Màng Nhân', desc: 'Đạt từ 40 câu đúng trở lên', icon: '🎬' },
  { id: 'b7', name: '🔀 Tiếp Hợp Đỉnh Cao', desc: 'Đạt từ 48 câu đúng trở lên', icon: '🔀' },
  { id: 'b8', name: '📐 Thang Định Xích Đạo', desc: 'Đạt từ 55 câu đúng trở lên', icon: '📐' },
  { id: 'b9', name: '🏹 Động Lực Vi Ống', desc: 'Đạt từ 62 câu đúng trở lên', icon: '🏹' },
  { id: 'b10', name: '✂️ Phân Tách Tâm Động', desc: 'Đạt từ 70 câu đúng trở lên', icon: '✂️' },
  { id: 'b11', name: '🌱 Thắt Eo Tế Bào Chất', desc: 'Đạt từ 78 câu đúng trở lên', icon: '🌱' },
  { id: 'b12', name: '🥚 Giao Tử Đơn Bộ', desc: 'Đạt từ 84 câu đúng trở lên', icon: '🥚' },
  { id: 'b13', name: '👑 Kỉ Lục Biến Dị', desc: 'Đạt tối đa 90/90 điểm câu đúng', icon: '👑' },
  { id: 'b14', name: '📡 Tần Số Không Gian', desc: 'Kích hoạt nghe nhạc nền Alien', icon: '📡' },
  { id: 'b15', name: '🎓 Thượng Đỉnh Bionova', desc: 'Có tên trong Top 1 Bảng xếp hạng', icon: '🎓' }
];

// 👑 HUY HIỆU ĐẶC QUYỀN CHỈ DÀNH CHO ADMIN
const ADMIN_BADGES_LIST = [
  { id: 'a1', name: '👑 Tối Thượng Quản Trị', desc: 'Đặc quyền tối cao của Admin BIONOVA', icon: '👑' },
  { id: 'a2', name: '🛡️ Vệ Thần Hệ Thống', desc: 'Bảo vệ và điều hành toàn bộ hệ sinh thái', icon: '🛡️' },
  { id: 'a3', name: '⚜️ Kiến Trúc Sư Bionova', desc: 'Người tạo lập và kiến tạo nội dung học liệu', icon: '⚜️' },
  { id: 'a4', name: '💎 Tinh Thể Vô Cực', desc: 'Huy hiệu huyền thoại độc nhất của Admin', icon: '💎' },
  { id: 'a5', name: '🔱 Quyền Trượng Di Truyền', desc: 'Quyền lực tuyệt đối với mọi học viên', icon: '🔱' }
];

// 🏅 HỆ THỐNG ~45 DANH HIỆU NÂNG CẤP THEO TIẾN TRÌNH ĐIỂM
// Sắp xếp theo `min` tăng dần — GET_TITLE_BY_SCORE chọn danh hiệu có min cao nhất ≤ score.
const TITLES_LIST = [
  { min: 0,  name: "🥚 Tế Bào Sơ Cấp",          desc: "Chưa làm bài — khởi đầu hành trình" },
  { min: 1,  name: "🌱 Hợp Tử Sơ Sinh",         desc: "Đạt 1+ câu đúng" },
  { min: 3,  name: "🪺 Phôi Mầm Bionova",       desc: "Đạt 3+ câu đúng" },
  { min: 6,  name: "🔬 Tập Sự Kính Hiển Vi",    desc: "Đạt 6+ câu đúng" },
  { min: 9,  name: "🧫 Nhà Quan Sát Tế Bào",    desc: "Đạt 9+ câu đúng" },
  { min: 12, name: "🌿 Mầm Sống Pha G1",        desc: "Đạt 12+ câu đúng" },
  { min: 15, name: "🧪 Thực Tập Sinh Phòng Lab",desc: "Đạt 15+ câu đúng" },
  { min: 18, name: "🧬 Thợ Săn Pha S",          desc: "Đạt 18+ câu đúng" },
  { min: 22, name: "🧠 Học Viên Sinh Học",      desc: "Đạt 22+ câu đúng" },
  { min: 25, name: "⏳ Trùm Cuối Pha G2",       desc: "Đạt 25+ câu đúng" },
  { min: 28, name: "🛰️ Trinh Sát ADN",          desc: "Đạt 28+ câu đúng" },
  { min: 32, name: "🚦 Trưởng Tháp Checkpoint", desc: "Đạt 32+ câu đúng" },
  { min: 35, name: "🧱 Kiến Tạo Vi Quản",       desc: "Đạt 35+ câu đúng" },
  { min: 38, name: "🌀 Tiền Bối Kì Đầu",        desc: "Đạt 38+ câu đúng" },
  { min: 40, name: "💠 Chuyên Gia Nguyên Phân", desc: "Đạt 40+ câu đúng" },
  { min: 42, name: "🪞 Người Nhân Đôi NST",     desc: "Đạt 42+ câu đúng" },
  { min: 45, name: "🏛️ Trưởng Lão Tế Bào Chất", desc: "Đạt 45+ câu đúng" },
  { min: 48, name: "🧬 Kĩ Sư Trao Đổi Chéo",    desc: "Đạt 48+ câu đúng" },
  { min: 50, name: "🎯 Xạ Thủ Tâm Động",        desc: "Đạt 50+ câu đúng" },
  { min: 52, name: "📜 Học Sĩ Di Truyền",       desc: "Đạt 52+ câu đúng" },
  { min: 55, name: "🔮 Chỉ Huy Kì Giữa II",     desc: "Đạt 55+ câu đúng" },
  { min: 58, name: "🦋 Vũ Công Thoi Phân Bào",  desc: "Đạt 58+ câu đúng" },
  { min: 60, name: "🏆 Đại Sứ Chromatid",       desc: "Đạt 60+ câu đúng" },
  { min: 62, name: "🏹 Chiến Binh Kì Sau II",   desc: "Đạt 62+ câu đúng" },
  { min: 64, name: "🪐 Nhà Du Hành Nhân Tế Bào",desc: "Đạt 64+ câu đúng" },
  { min: 66, name: "🛡️ Vệ Sĩ Bộ Gen",           desc: "Đạt 66+ câu đúng" },
  { min: 68, name: "🌌 Du Tử Vũ Trụ ADN",       desc: "Đạt 68+ câu đúng" },
  { min: 70, name: "⚡ Đột Phá Giảm Phân",       desc: "Đạt 70+ câu đúng" },
  { min: 72, name: "🦴 Bậc Thầy Phân Đôi",      desc: "Đạt 72+ câu đúng" },
  { min: 74, name: "🧙 Pháp Sư Sinh Học",       desc: "Đạt 74+ câu đúng" },
  { min: 76, name: "🔱 Chúa Tể Kì Cuối",        desc: "Đạt 76+ câu đúng" },
  { min: 78, name: "🌟 Giáo Sư Phân Bào",        desc: "Đạt 78+ câu đúng" },
  { min: 80, name: "🎓 Tiến Sĩ Tế Bào Học",     desc: "Đạt 80+ câu đúng" },
  { min: 82, name: "🪄 Phù Thủy Crossing-Over", desc: "Đạt 82+ câu đúng" },
  { min: 84, name: "🦅 Đại Bàng Nhiễm Sắc",     desc: "Đạt 84+ câu đúng" },
  { min: 85, name: "🪐 Học Giả Tế Bào Học",     desc: "Đạt 85+ câu đúng" },
  { min: 86, name: "🐉 Long Vương Giảm Phân",   desc: "Đạt 86+ câu đúng" },
  { min: 87, name: "💫 Tinh Linh Bionova",      desc: "Đạt 87+ câu đúng" },
  { min: 88, name: "🌠 Sao Băng Di Truyền",     desc: "Đạt 88+ câu đúng" },
  { min: 89, name: "🏵️ Đại Hiền Triết Sinh Học",desc: "Đạt 89+ câu đúng" },
  { min: 90, name: "👑 Đại Đế Di Truyền",        desc: "Đạt tối đa 90/90 — đỉnh cao Bionova" },
];

const GET_TITLE_BY_SCORE = (score) => {
  let result = TITLES_LIST[0].name;
  for (const t of TITLES_LIST) {
    if (score >= t.min) result = t.name;
    else break;
  }
  return result;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('concepts');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [bgVolume, setBgVolume] = useState(25); 
  const audioElRef = useRef(null);

  const [themeStyle, setThemeStyle] = useState('slate'); 
  const [enableAnimation, setEnableAnimation] = useState(true);

  // Quản lý thông tin đăng nhập
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [realNameInput, setRealNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [accountsList, setAccountsList] = useState([]);
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdNew2, setPwdNew2] = useState('');
  const [pwdMsg, setPwdMsg] = useState(null); // { type:'ok'|'err', text:string }
  const [pwdLoading, setPwdLoading] = useState(false);

  // Quản lý trạng thái xem video
  const [playingVideoUrl, setPlayingVideoUrl] = useState(null);
  const [playingVideoTitle, setPlayingVideoTitle] = useState('');

  // Quản lý trạng thái hiển thị Khái niệm (Accordion)
  const [expandedConcept, setExpandedConcept] = useState(null);

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  // Chỉ random thứ tự đáp án, KHÔNG random thứ tự câu hỏi
  const [quizOrder, setQuizOrder] = useState(() => buildShuffledQuiz(QUIZ_QUESTIONS));
  const [aiQuizHint, setAiQuizHint] = useState('');
  const [aiQuizLoading, setAiQuizLoading] = useState(false);

  const [aiInput, setAiInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const chatScrollRef = React.useRef(null);

  // 🆘 Bong bóng hỗ trợ AI + nhắn admin
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMode, setSupportMode] = useState('ai'); // 'ai' | 'admin'
  const [supportInput, setSupportInput] = useState('');
  const [supportMessages, setSupportMessages] = useState([]); // tin AI cho user
  const [supportLoading, setSupportLoading] = useState(false);
  const [adminTickets, setAdminTickets] = useState([]); // toàn bộ ticket (admin xem)
  const [myTickets, setMyTickets] = useState([]); // ticket của user hiện tại
  const [adminReplyDraft, setAdminReplyDraft] = useState({}); // {ticketId: text}
  const [supportSentMsg, setSupportSentMsg] = useState('');
  const supportScrollRef = React.useRef(null);

  // Tự động cuộn xuống dưới khi có tin nhắn mới hoặc đang stream typewriter
  React.useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isAiLoading]);

  React.useEffect(() => {
    const el = supportScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [supportMessages, supportLoading, supportOpen, supportMode]);

  // Cấu hình do admin đặt (đồng bộ tất cả thiết bị)
  const [appSettings, setAppSettings] = useState({
    music_url: '',
    music_title: 'Nhạc nền hệ thống',
    pdf_url: '',
    pdf_name: 'Tai_lieu.pdf',
    videos: [],
    default_videos: [],
    admin_password: 'bionova2026',
  });
  const [adminMsg, setAdminMsg] = useState('');
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Hàm load settings từ Supabase
  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setAppSettings({
        music_url: data.music_url || '',
        music_title: data.music_title || 'Nhạc nền hệ thống',
        pdf_url: data.pdf_url || '',
        pdf_name: data.pdf_name || 'Tai_lieu.pdf',
        videos: Array.isArray(data.videos) ? data.videos : [],
        default_videos: Array.isArray(data.default_videos) ? data.default_videos : [],
        admin_password: data.admin_password || 'bionova2026',
      });
    }
  };

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('accounts')
      .select('username, real_name, score, title, badges, role')
      .order('score', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(100);
    if (data) {
      setLeaderboard(data.map(d => ({ ...d, badges: Array.isArray(d.badges) ? d.badges : [] })));
    }
  };

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('accounts')
      .select('id, real_name, username, role, score, title, created_at')
      .order('created_at', { ascending: false });
    if (data) setAccountsList(data);
  };

  // Tải dữ liệu ban đầu
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    loadSettings();
    loadLeaderboard();

    // Realtime: tự cập nhật khi admin đổi nhạc/video/PDF
    const settingsCh = supabase.channel('app_settings_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => loadSettings())
      .subscribe();
    const lbCh = supabase.channel('lb_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => { loadLeaderboard(); loadAccounts(); })
      .subscribe();

    const sessionUser = localStorage.getItem('biotech_current_user');
    if (sessionUser) {
      try {
        const u = JSON.parse(sessionUser);
        setCurrentUser(u);
        setIsLoggedIn(true);
      } catch {}
    }
    return () => {
      supabase.removeChannel(settingsCh);
      supabase.removeChannel(lbCh);
    };
  }, []);

  // Tải danh sách tài khoản khi vào tab admin
  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUser?.role]);

  // 🆘 Load support tickets + realtime
  const loadAdminTickets = async () => {
    const { data } = await supabase.from('support_messages').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) setAdminTickets(data);
  };
  const loadMyTickets = async () => {
    if (!currentUser?.id) return;
    const { data } = await supabase.from('support_messages').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50);
    if (data) setMyTickets(data);
  };
  useEffect(() => {
    if (!currentUser) return;
    loadMyTickets();
    if (isAdmin) loadAdminTickets();
    const ch = supabase.channel('support_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        loadMyTickets();
        if (isAdmin) loadAdminTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  // Lời chào AI thay đổi theo role
  useEffect(() => {
    if (!currentUser) return;
    setMessages([{
      role: 'assistant',
      text: isAdmin
        ? `🛡️ Báo cáo Quản trị viên ${currentUser.real_name || currentUser.username}! BIOSEA AI sẵn sàng hỗ trợ điều hành hệ thống BIONOVA LEGACY. Sếp có thể hỏi về thống kê học viên, gợi ý nội dung, hoặc bất kỳ chủ đề sinh học nào. 🧬`
        : `🧬 Xin chào ${currentUser.real_name || currentUser.username}! Mình là BIOSEA AI — trợ lý học tập của BIONOVA LEGACY. Hỏi mình về Chu kì tế bào, Nguyên phân, Giảm phân nhé! 🌿🧪`,
    }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  // 🔊 Nhạc nền: phát file do admin upload (mọi user nghe cùng nguồn)
  const toggleBackgroundMusic = async () => {
    if (!appSettings.music_url) {
      alert('Admin chưa thiết lập nhạc nền. Vào tab ⚙️ Admin để tải lên.');
      return;
    }
    const el = audioElRef.current;
    if (!el) return;
    if (isPlayingAudio) {
      el.pause();
      setIsPlayingAudio(false);
    } else {
      try {
        el.volume = bgVolume / 100;
        // iOS Safari: đảm bảo src đã set & load trước khi play (tránh AbortError)
        if (!el.src || el.src !== appSettings.music_url) {
          el.src = appSettings.music_url;
        }
        el.load();
        const playPromise = el.play();
        if (playPromise && typeof playPromise.then === 'function') {
          await playPromise;
        }
        setIsPlayingAudio(true);
        if (currentUser && !currentUser.badges.includes('📡')) {
          const updatedBadges = [...currentUser.badges, '📡'];
          const updatedUser = { ...currentUser, badges: updatedBadges };
          setCurrentUser(updatedUser);
          localStorage.setItem('biotech_current_user', JSON.stringify(updatedUser));
        }
      } catch (e) {
        // iOS thường trả AbortError khi load bị gián đoạn — thử lại 1 lần
        if (e && (e.name === 'AbortError' || /aborted/i.test(e.message || ''))) {
          try {
            await new Promise((r) => setTimeout(r, 250));
            await el.play();
            setIsPlayingAudio(true);
            return;
          } catch (e2) {
            alert('Không phát được nhạc trên thiết bị này. Vui lòng bấm lại nút phát. (' + (e2.message || e2.name) + ')');
            return;
          }
        }
        alert('Không phát được nhạc: ' + (e.message || e.name));
      }
    }
  };

  // Cập nhật âm lượng khi slider thay đổi
  useEffect(() => {
    if (audioElRef.current) audioElRef.current.volume = bgVolume / 100;
  }, [bgVolume]);

  // Đăng ký / Đăng nhập (đồng bộ Supabase)
  const handleAuth = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAuthError('');
    const uname = usernameInput.trim().toLowerCase();
    const pwd = passwordInput;
    const realName = realNameInput.trim();
    if (!uname || !pwd) { setAuthError('Vui lòng nhập đầy đủ username và mật khẩu'); return; }

    // Rate limit chống brute-force (5 lần sai / 60s)
    try {
      const raw = localStorage.getItem('biotech_auth_lock');
      if (raw) {
        const lock = JSON.parse(raw);
        if (lock.until && Date.now() < lock.until) {
          const secs = Math.ceil((lock.until - Date.now()) / 1000);
          setAuthError(`Quá nhiều lần thử. Vui lòng đợi ${secs}s.`);
          return;
        }
      }
    } catch {}

    const bumpFail = () => {
      try {
        const raw = localStorage.getItem('biotech_auth_lock');
        const lock = raw ? JSON.parse(raw) : { count: 0, until: 0 };
        lock.count = (lock.count || 0) + 1;
        if (lock.count >= 5) { lock.until = Date.now() + 60_000; lock.count = 0; }
        localStorage.setItem('biotech_auth_lock', JSON.stringify(lock));
      } catch {}
    };
    const clearFail = () => { try { localStorage.removeItem('biotech_auth_lock'); } catch {} };

    if (authMode === 'register') {
      if (!realName) { setAuthError('Vui lòng nhập tên thật'); return; }
      if (pwd.length < 6) { setAuthError('Mật khẩu tối thiểu 6 ký tự'); return; }
      if (!/^[a-z0-9_]{3,24}$/.test(uname)) { setAuthError('Username 3-24 ký tự (chữ thường, số, _)'); return; }
      const { data: inserted, error } = await supabase.rpc('register_account', {
        p_username: uname, p_real_name: realName, p_password: pwd,
      });
      if (error) { setAuthError('Đăng ký lỗi: ' + error.message); return; }
      const user = { ...inserted, badges: Array.isArray(inserted.badges) ? inserted.badges : ['🧫'] };
      localStorage.setItem('biotech_current_user', JSON.stringify(user));
      setCurrentUser(user);
      setIsLoggedIn(true);
      clearFail();
      loadLeaderboard();
    } else {
      const { data: acc, error } = await supabase.rpc('login_account', {
        p_username: uname, p_password: pwd,
      });
      if (error || !acc) { bumpFail(); setAuthError('Tài khoản hoặc mật khẩu không đúng'); return; }
      const user = { ...acc, badges: Array.isArray(acc.badges) ? acc.badges : ['🧫'] };
      localStorage.setItem('biotech_current_user', JSON.stringify(user));
      setCurrentUser(user);
      setIsLoggedIn(true);
      clearFail();
    }
    setPasswordInput('');
  };

  const handleUpdateNickname = async (newName) => {
    if (!newName.trim() || !currentUser) return;
    const name = newName.trim();
    if (name === currentUser.real_name) return;
    await supabase.from('accounts')
      .update({ real_name: name, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);
    const updatedUser = { ...currentUser, real_name: name };
    setCurrentUser(updatedUser);
    localStorage.setItem('biotech_current_user', JSON.stringify(updatedUser));
    loadLeaderboard();
  };

  const handleLogout = () => {
    localStorage.removeItem('biotech_current_user');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setUsernameInput('');
    if (audioElRef.current) audioElRef.current.pause();
    setIsPlayingAudio(false);
  };

  // Đổi mật khẩu (gọi RPC change_password — verify mật khẩu cũ trước khi cập nhật)
  const handleChangePassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPwdMsg(null);
    if (!currentUser?.id) { setPwdMsg({ type:'err', text:'Bạn cần đăng nhập.' }); return; }
    if (!pwdOld || !pwdNew || !pwdNew2) { setPwdMsg({ type:'err', text:'Vui lòng nhập đầy đủ 3 ô.' }); return; }
    if (pwdNew.length < 6 || pwdNew.length > 72) { setPwdMsg({ type:'err', text:'Mật khẩu mới phải 6-72 ký tự.' }); return; }
    if (pwdNew !== pwdNew2) { setPwdMsg({ type:'err', text:'Mật khẩu mới nhập lại không khớp.' }); return; }
    if (pwdNew === pwdOld) { setPwdMsg({ type:'err', text:'Mật khẩu mới phải khác mật khẩu cũ.' }); return; }
    setPwdLoading(true);
    try {
      const { data, error } = await supabase.rpc('change_password', {
        p_user_id: currentUser.id,
        p_old_password: pwdOld,
        p_new_password: pwdNew,
      });
      if (error) { setPwdMsg({ type:'err', text: error.message || 'Đổi mật khẩu thất bại.' }); return; }
      if (data === true) {
        setPwdMsg({ type:'ok', text:'✅ Đổi mật khẩu thành công! Lần đăng nhập sau dùng mật khẩu mới nhé.' });
        setPwdOld(''); setPwdNew(''); setPwdNew2('');
      } else {
        setPwdMsg({ type:'err', text:'Đổi mật khẩu thất bại.' });
      }
    } catch (err) {
      setPwdMsg({ type:'err', text: err?.message || 'Có lỗi xảy ra, thử lại sau.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn đặt lại toàn bộ tiến trình học tập của mình không?")) return;
    if (!currentUser) return;
    const resetUser = { ...currentUser, score: 0, title: GET_TITLE_BY_SCORE(0), badges: ['🧫'] };
    setCurrentUser(resetUser);
    localStorage.setItem('biotech_current_user', JSON.stringify(resetUser));
    await supabase.from('accounts')
      .update({ score: 0, title: resetUser.title, badges: resetUser.badges, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);
    loadLeaderboard();
    restartQuiz();
  };

  const updateGlobalStats = async (finalScore) => {
    if (!currentUser) return;
    let updatedBadges = ['🧫']; // Đảm bảo luôn giữ badge đầu tiên
    
    // Kiểm tra và cấp phát tự động trong 15 huy hiệu dựa trên điểm số
    if (finalScore >= 5) updatedBadges.push('🚦');
    if (finalScore >= 12) updatedBadges.push('🧪');
    if (finalScore >= 20) updatedBadges.push('🧬');
    if (finalScore >= 30) updatedBadges.push('🔄');
    if (finalScore >= 40) updatedBadges.push('🎬');
    if (finalScore >= 48) updatedBadges.push('🔀');
    if (finalScore >= 55) updatedBadges.push('📐');
    if (finalScore >= 62) updatedBadges.push('🏹');
    if (finalScore >= 70) updatedBadges.push('✂️');
    if (finalScore >= 78) updatedBadges.push('🌱');
    if (finalScore >= 84) updatedBadges.push('🥚');
    if (finalScore >= 90) updatedBadges.push('👑');
    if (currentUser.badges.includes('📡')) updatedBadges.push('📡'); // Bảo lưu nhạc nền nếu có

    const newTitle = GET_TITLE_BY_SCORE(finalScore);
    const maxScore = Math.max(currentUser.score, finalScore);

    const updatedUser = { ...currentUser, score: maxScore, title: newTitle, badges: updatedBadges };
    setCurrentUser(updatedUser);
    localStorage.setItem('biotech_current_user', JSON.stringify(updatedUser));

    await supabase.from('accounts')
      .update({ score: maxScore, title: newTitle, badges: updatedBadges, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);
    loadLeaderboard();
  };

  const handleOptionSelect = (option) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);
    const correct = option === quizOrder[quizIndex].answer;
    if (correct) {
      setScore(prev => {
        const nextScore = prev + 1;
        if (isLoggedIn) updateGlobalStats(nextScore);
        return nextScore;
      });
    }
    // Tự động gọi AI giải thích sau khi trả lời
    handleAiExplainQuiz(option, correct);
  };

  // =================== ADMIN FUNCTIONS ===================
  const isAdmin = currentUser?.role === 'admin';

  const handleDeleteAccount = async (accId, accUsername) => {
    if (!isAdmin) return;
    if (accId === currentUser?.id) { alert('Không thể xoá chính mình'); return; }
    if (!window.confirm(`Xoá học viên "${accUsername}"? Hành động này không thể hoàn tác.`)) return;
    const { error } = await supabase.from('accounts').delete().eq('id', accId);
    if (error) { alert('Lỗi: ' + error.message); return; }
    loadAccounts();
    loadLeaderboard();
    setAdminMsg(`🗑️ Đã xoá học viên ${accUsername}`);
  };

  const uploadToStorage = async (file, prefix) => {
    const ext = file.name.split('.').pop();
    const path = `${prefix}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUploadMusic = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMusic(true); setAdminMsg('⏳ Đang tải nhạc lên...');
    try {
      const url = await uploadToStorage(file, 'music');
      await supabase.from('app_settings').update({ music_url: url, music_title: file.name, updated_at: new Date().toISOString() }).eq('id', 1);
      await loadSettings();
      setAdminMsg('✅ Nhạc nền đã cập nhật cho tất cả người dùng');
    } catch (err) { setAdminMsg('❌ Lỗi: ' + err.message); }
    setUploadingMusic(false);
  };

  const handleUploadPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true); setAdminMsg('⏳ Đang tải PDF lên...');
    try {
      const url = await uploadToStorage(file, 'pdf');
      await supabase.from('app_settings').update({ pdf_url: url, pdf_name: file.name, updated_at: new Date().toISOString() }).eq('id', 1);
      await loadSettings();
      setAdminMsg('✅ PDF đã cập nhật cho tất cả người dùng');
    } catch (err) { setAdminMsg('❌ Lỗi: ' + err.message); }
    setUploadingPdf(false);
  };

  const handleAddVideo = async (video) => {
    const next = [...(appSettings.videos || []), { ...video, id: 'v_' + Date.now() }];
    await supabase.from('app_settings').update({ videos: next, updated_at: new Date().toISOString() }).eq('id', 1);
    await loadSettings();
    setAdminMsg('✅ Đã thêm video');
  };

  const handleDeleteVideo = async (id) => {
    const next = (appSettings.videos || []).filter(v => v.id !== id);
    await supabase.from('app_settings').update({ videos: next, updated_at: new Date().toISOString() }).eq('id', 1);
    await loadSettings();
  };

  const handleUploadVideoFile = async (e, meta) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdminMsg('⏳ Đang tải video lên...');
    try {
      const url = await uploadToStorage(file, 'video');
      await handleAddVideo({ ...meta, url, thumb: '🎬', duration: '—' });
    } catch (err) { setAdminMsg('❌ Lỗi: ' + err.message); }
  };

  // Lưu chỉnh sửa 1 trong 15 video mặc định
  const handleSaveDefaultVideo = async (video) => {
    const list = (appSettings.default_videos || []).map(v => v.id === video.id ? video : v);
    await supabase.from('app_settings').update({ default_videos: list, updated_at: new Date().toISOString() }).eq('id', 1);
    await loadSettings();
    setAdminMsg('✅ Đã lưu video: ' + video.title);
  };
  const handleDeleteDefaultVideo = async (id) => {
    if (!window.confirm('Xóa video mặc định này?')) return;
    const list = (appSettings.default_videos || []).filter(v => v.id !== id);
    await supabase.from('app_settings').update({ default_videos: list, updated_at: new Date().toISOString() }).eq('id', 1);
    await loadSettings();
  };
  const handleAddDefaultVideo = async () => {
    const list = [...(appSettings.default_videos || []), {
      id: 'd_' + Date.now(),
      title: 'Video mới',
      topic: 'Tổng hợp',
      thumb: '🎬',
      duration: '—',
      url: 'https://www.youtube.com/embed/'
    }];
    await supabase.from('app_settings').update({ default_videos: list, updated_at: new Date().toISOString() }).eq('id', 1);
    await loadSettings();
  };

  const handleNextQuestion = () => {
    if (quizIndex < quizOrder.length - 1) {
      setQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setAiQuizHint('');
    } else {
      setQuizComplete(true);
    }
  };

  const restartQuiz = () => {
    setQuizOrder(buildShuffledQuiz(QUIZ_QUESTIONS));
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizComplete(false);
    setAiQuizHint('');
  };

  // 🧠 AI giải quyết câu hỏi quiz hiện tại
  const handleAiSolveQuiz = async () => {
    if (aiQuizLoading) return;
    const q = quizOrder[quizIndex];
    if (!q) return;
    setAiQuizLoading(true);
    setAiQuizHint('');
    try {
      const system = 'Bạn là BIOSEA AI — chuyên gia Sinh học THPT. Hãy phân tích câu trắc nghiệm và chọn đáp án đúng. Trả lời ngắn gọn bằng tiếng Việt theo định dạng:\n**Đáp án:** <nguyên văn đáp án đúng>\n**Giải thích:** <1-3 câu ngắn gọn, rõ ràng>';
      const user = `Câu hỏi: ${q.question}\nCác lựa chọn:\n${q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('\n')}`;
      await streamAiChat({ system, messages: [{ role: 'user', content: user }] }, (txt) => setAiQuizHint(txt));
    } catch (err) {
      setAiQuizHint('⚠️ Lỗi kết nối AI: ' + err.message);
    } finally {
      setAiQuizLoading(false);
    }
  };

  // 🧠 AI giải thích sau khi người dùng chọn đáp án (đúng/sai)
  const handleAiExplainQuiz = async (userAnswer, isCorrect) => {
    const q = quizOrder[quizIndex];
    if (!q) return;
    setAiQuizLoading(true);
    setAiQuizHint('');
    try {
      const system = `Bạn là BIOSEA AI — gia sư Sinh học THPT thân thiện. Học viên vừa ${isCorrect ? 'TRẢ LỜI ĐÚNG ✅' : 'TRẢ LỜI SAI ❌'}. Hãy giải thích ngắn gọn bằng tiếng Việt theo định dạng markdown:\n**Nhận xét:** <1 câu khen/động viên>\n**Đáp án đúng:** <nguyên văn đáp án đúng>\n**Giải thích:** <2-4 câu rõ ràng, dễ hiểu, có thể dùng emoji 🧬🧫>${isCorrect ? '' : '\n**Vì sao em sai:** <chỉ rõ lý do đáp án em chọn không đúng>'}`;
      const user = `Câu hỏi: ${q.question}\nCác lựa chọn:\n${q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('\n')}\nĐáp án đúng: ${q.answer}\nĐáp án học viên chọn: ${userAnswer}`;
      await streamAiChat({ system, messages: [{ role: 'user', content: user }] }, (txt) => setAiQuizHint(txt));
    } catch (err) {
      setAiQuizHint('⚠️ Lỗi kết nối AI: ' + err.message);
    } finally {
      setAiQuizLoading(false);
    }
  };

  // Hệ thống Chat hỗ trợ AI
  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || isAiLoading) return;
    
    const userText = aiInput.trim();
    const newHistory = [...messages, { role: 'user', text: userText }];
    setMessages(newHistory);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const systemPrompt = isAdmin
        ? `Bạn là BIOSEA AI — trợ lý cao cấp của hệ thống BIONOVA LEGACY, đang giao tiếp với QUẢN TRỊ VIÊN (admin) "${currentUser?.real_name || currentUser?.username}". Hãy trả lời với giọng điệu trang trọng, chuyên nghiệp như một cố vấn kỹ thuật: cung cấp thống kê, gợi ý quản trị hệ thống, tư vấn cấu hình, đề xuất nội dung học liệu. Xưng "Báo cáo Quản trị viên" và gọi họ là "Sếp" hoặc "Admin". Khi được hỏi về sinh học, vẫn trả lời chính xác nhưng kèm góc nhìn quản trị nội dung.`
        : `Bạn là BIOSEA AI — trợ lý học tập thân thiện của hệ thống BIONOVA LEGACY, đang giúp học viên "${currentUser?.real_name || currentUser?.username}" (danh hiệu: ${currentUser?.title}). Trả lời các câu hỏi về Chu kì tế bào, Nguyên phân, Giảm phân bằng tiếng Việt, ngắn gọn, dùng emoji 🧬🧫🔬 và giảng dạy như một gia sư sinh học cấp 3.`;

      const chatMessages = newHistory.slice(-12).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      }));
      // Stream trực tiếp từ AI — hiển thị token ngay khi đến, nhanh hơn nhiều
      setIsAiLoading(false);
      setMessages(prev => [...prev, { role: 'assistant', text: '' }]);
      await streamAiChat({ system: systemPrompt, messages: chatMessages }, (partial) => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', text: partial };
          return next;
        });
      });
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Lỗi kết nối AI: ' + error.message }]);
      setIsAiLoading(false);
    }
  };

  // 🆘 Bong bóng hỗ trợ: gửi câu hỏi cho AI hỗ trợ kỹ thuật
  const handleSupportAi = async (e) => {
    e?.preventDefault?.();
    const text = supportInput.trim();
    if (!text || supportLoading) return;
    const history = [...supportMessages, { role: 'user', text }];
    setSupportMessages(history);
    setSupportInput('');
    setSupportLoading(true);
    try {
      const system = `Bạn là BIOSEA SUPPORT — trợ lý hỗ trợ kỹ thuật của BIONOVA LEGACY, đang giúp người dùng "${currentUser?.real_name || currentUser?.username}" xử lý các lỗi/khó khăn khi sử dụng app. App có các tính năng: đăng nhập, xem video, làm quiz 90 câu (chỉ random đáp án), bảng xếp hạng, huy hiệu, AI chat, nhạc nền, tài liệu PDF. Trả lời ngắn gọn, từng bước rõ ràng bằng tiếng Việt, có emoji. Nếu vấn đề vượt quyền hạn (ví dụ: khôi phục mật khẩu, xoá tài khoản, lỗi dữ liệu, khiếu nại), hãy hướng dẫn người dùng bấm nút "Nhắn Admin" ở tab bên cạnh để gửi trực tiếp cho quản trị viên.`;
      const chatMsgs = history.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));
      setSupportMessages(prev => [...prev, { role: 'assistant', text: '' }]);
      await streamAiChat({ system, messages: chatMsgs }, (partial) => {
        setSupportMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', text: partial };
          return next;
        });
      });
    } catch (err) {
      setSupportMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Lỗi AI: ' + err.message }]);
    } finally {
      setSupportLoading(false);
    }
  };

  // 🆘 Gửi tin nhắn trực tiếp cho admin
  const handleSendToAdmin = async (e) => {
    e?.preventDefault?.();
    const text = supportInput.trim();
    if (!text) return;
    setSupportLoading(true);
    const { error } = await supabase.from('support_messages').insert({
      user_id: currentUser?.id || null,
      username: currentUser?.username || 'guest',
      real_name: currentUser?.real_name || null,
      message: text,
      status: 'open',
    });
    setSupportLoading(false);
    if (error) {
      setSupportSentMsg('⚠️ Không gửi được: ' + error.message);
    } else {
      setSupportInput('');
      setSupportSentMsg('✅ Đã gửi cho Admin. Bạn sẽ nhận được phản hồi tại đây.');
      loadMyTickets();
      setTimeout(() => setSupportSentMsg(''), 4000);
    }
  };

  // 🛡️ Admin trả lời ticket
  const handleAdminReply = async (ticket) => {
    const reply = (adminReplyDraft[ticket.id] || '').trim();
    if (!reply) return;
    const { error } = await supabase.from('support_messages').update({
      reply, status: 'answered', replied_at: new Date().toISOString(),
    }).eq('id', ticket.id);
    if (!error) {
      setAdminReplyDraft(prev => ({ ...prev, [ticket.id]: '' }));
      loadAdminTickets();
    } else {
      alert('Lỗi: ' + error.message);
    }
  };
  const handleDeleteTicket = async (id) => {
    if (!confirm('Xoá tin nhắn này?')) return;
    await supabase.from('support_messages').delete().eq('id', id);
    loadAdminTickets();
  };

  const progressPercent = useMemo(() => Math.round(((quizIndex + 1) / quizOrder.length) * 100), [quizIndex, quizOrder.length]);
  const sortedLeaderboard = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  const allVideos = useMemo(() => {
    const admin = (appSettings.videos || []).map(v => ({ topic: 'Admin', thumb: '🎬', duration: '—', ...v }));
    const defaults = (appSettings.default_videos && appSettings.default_videos.length > 0)
      ? appSettings.default_videos
      : VIDEOS_LIST;
    return [...admin, ...defaults];
  }, [appSettings.videos, appSettings.default_videos]);
  
  const wrapperThemeClass = useMemo(() => {
    if (themeStyle === 'ocean') return 'bg-[#040d1f] text-blue-100';
    if (themeStyle === 'emerald') return 'bg-stone-950 text-emerald-100';
    return 'bg-slate-950 text-slate-100';
  }, [themeStyle]);

  // Áp filter lên toàn bộ app để 3 nút theme có tác dụng thực sự
  // Ocean: tone xanh dương sâu thẳm, tối hơn; Emerald: ngả lục.
  const wrapperThemeStyle = useMemo(() => {
    if (themeStyle === 'ocean') return { filter: 'hue-rotate(-30deg) saturate(1.2) brightness(0.85)' };
    if (themeStyle === 'emerald') return { filter: 'hue-rotate(-18deg) saturate(1.1)' };
    return undefined;
  }, [themeStyle]);

  const accentColorClass = useMemo(() => {
    if (themeStyle === 'ocean') return 'from-blue-700 to-blue-900 text-blue-300 border-blue-700';
    if (themeStyle === 'emerald') return 'from-emerald-400 to-teal-500 text-emerald-400 border-emerald-500';
    return 'from-teal-400 to-indigo-500 text-teal-400 border-indigo-500';
  }, [themeStyle]);

  // NẾU CHƯA ĐĂNG KÝ: HIỂN THỊ MÀN HÌNH KHÓA ÉP BUỘC ĐĂNG KÝ TRƯỚC KHI VÀO WEB
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 max-w-md w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 to-indigo-500"></div>
          <div className="w-20 h-20 bg-gradient-to-tr from-teal-500/20 to-indigo-500/20 border-2 border-teal-400/40 rounded-2xl flex items-center justify-center text-4xl mx-auto shadow-inner animate-pulse">
            🧬
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">BIONOVA LEGACY</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {authMode === 'register'
                ? 'Tạo tài khoản học viên mới. Tài khoản đầu tiên với username "admin" sẽ trở thành Quản trị viên.'
                : 'Đăng nhập bằng tài khoản học viên đã đăng ký để vào hệ thống.'}
            </p>
          </div>
          <div className="flex gap-2 bg-slate-950 rounded-xl p-1">
            <button onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${authMode==='login'?'bg-teal-500 text-slate-950':'text-slate-400'}`}>Đăng nhập</button>
            <button onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${authMode==='register'?'bg-indigo-500 text-white':'text-slate-400'}`}>Đăng ký</button>
          </div>
          <form onSubmit={handleAuth} action="#" method="post" className="space-y-3 text-left">
            {authMode === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider pl-1">Tên thật</label>
                <input type="text" value={realNameInput} onChange={(e)=>setRealNameInput(e.target.value)} maxLength={40} placeholder="VD: Nguyễn Văn A"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 px-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider pl-1">Username</label>
              <input type="text" value={usernameInput} onChange={(e)=>setUsernameInput(e.target.value)} maxLength={20} placeholder="username (không dấu)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 px-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider pl-1">Mật khẩu</label>
              <input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} placeholder="••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 px-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600" />
            </div>
            {authError && <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg">{authError}</div>}
            <button type="button" onClick={(e)=>handleAuth(e)}
              className="w-full bg-gradient-to-r from-teal-400 to-indigo-500 hover:from-teal-300 hover:to-indigo-400 text-slate-950 font-black text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg">
              {authMode==='register'?'Tạo Tài Khoản & Vào Hệ Thống':'Đăng Nhập'}
            </button>
          </form>
          <div className="text-[10px] text-slate-500 font-medium pt-2">
            Hệ thống đồng bộ điểm và bảng xếp hạng theo thời gian thực.
          </div>
        </div>
      </div>
    );
  }

  // GIAO DIỆN CHÍNH SAU KHI ĐÃ ĐĂNG KÝ THÀNH CÔNG
  return (
    <div
      className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${wrapperThemeClass}`}
      style={wrapperThemeStyle}
    >
      {/* Audio nền dùng chung cho mọi user */}
      <audio ref={audioElRef} src={appSettings.music_url || undefined} loop preload="metadata" playsInline crossOrigin="anonymous" />
      
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Mở menu"
            className="relative w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-400 transition-all"
          >
            <span className={`block h-0.5 w-5 bg-teal-400 transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`}></span>
            <span className={`block h-0.5 w-5 bg-teal-400 transition-opacity ${menuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block h-0.5 w-5 bg-teal-400 transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`}></span>
          </button>
          <img
            src={brandAsset.url}
            alt="BIONOVA LEGACY"
            className="w-12 h-12 rounded-xl object-cover shadow-lg ring-1 ring-slate-700"
          />
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">BIONOVA LEGACY</h1>
            <p className="text-xs text-slate-400 font-medium">Hệ thống Khám phá Chu kì Tế bào & Phân bào</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleBackgroundMusic} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isPlayingAudio ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'}`}>
            {isPlayingAudio ? `🎵 Nhạc nền: Bật (${bgVolume}%)` : (appSettings.music_url ? '🔇 Nhạc nền: Tắt' : '⚠️ Chưa có nhạc')}
          </button>
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <div className="text-right">
              <p className="text-xs font-bold text-teal-400">{currentUser?.real_name || currentUser?.username} {isAdmin && <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded ml-1">ADMIN</span>}</p>
              <p className="text-[10px] text-amber-400 font-bold">🎖️ {currentUser?.title}</p>
            </div>
            <button onClick={handleLogout} className="text-[10px] bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-slate-950 px-2 py-1 rounded font-bold transition-all">Đăng xuất</button>
          </div>
        </div>
      </header>

      {/* OFF-CANVAS MENU (mở từ nút 3 gạch) */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed top-0 left-0 h-full w-72 bg-slate-900 border-r border-slate-800 z-50 p-4 shadow-2xl flex flex-col gap-2 overflow-y-auto">
            <div className="flex items-center justify-between mb-2 pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-teal-400">📂 Khu Vực Bionova</h2>
              <button onClick={() => setMenuOpen(false)} className="text-slate-400 hover:text-rose-400 text-lg leading-none">✕</button>
            </div>
            {[
              { id: 'concepts',    label: '📚 Khái Niệm',                       color: 'teal' },
              { id: 'videos',      label: `🎥 Thư Viện Video (${allVideos.length})`, color: 'teal' },
              { id: 'quiz',        label: '✍️ Trắc Nghiệm (90 Câu)',             color: 'teal' },
              { id: 'leaderboard', label: '🏆 Bảng Xếp Hạng',                    color: 'teal' },
              { id: 'settings',    label: `⚙️ Thành Tích (${isAdmin ? `${BADGES_LIST.length + ADMIN_BADGES_LIST.length}/${BADGES_LIST.length + ADMIN_BADGES_LIST.length}` : `${currentUser?.badges?.length || 0}/${BADGES_LIST.length}`})`, color: 'indigo' },
              { id: 'ai-chat',     label: '🤖 BIOSEA AI',                        color: 'teal' },
              ...(isAdmin ? [{ id: 'admin', label: '🔐 Admin', color: 'amber' }] : []),
            ].map((it) => {
              const active = activeTab === it.id;
              const activeCls = it.color === 'amber'
                ? 'bg-amber-500 text-slate-950'
                : it.color === 'indigo'
                ? 'bg-indigo-500 text-white'
                : 'bg-teal-500 text-slate-950';
              return (
                <button
                  key={it.id}
                  onClick={() => { setActiveTab(it.id); setMenuOpen(false); }}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${active ? `${activeCls} shadow` : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  {it.label}
                </button>
              );
            })}
            <p className="mt-auto pt-4 text-[10px] text-slate-500 italic border-t border-slate-800">
              🌊 BIONOVA LEGACY • Khám phá đại dương sinh học
            </p>
          </aside>
        </>
      )}

      {/* MAIN LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KHU VỰC CHÍNH ĐƯỢC CHỌN TỪ CÁC TAB */}
        <div className="lg:col-span-2 space-y-6">

            <>
              {/* TAB 1: KHÁM PHÁ KIẾN THỨC NÂNG CẤP CHỮ TO & XEM CHI TIẾT */}
              {activeTab === 'concepts' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden min-h-[160px] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2 py-0.5 rounded">Hệ thống Lý Thuyết</span>
                      <h2 className="text-2xl sm:text-3xl font-black mt-2 bg-gradient-to-r from-teal-300 to-indigo-300 bg-clip-text text-transparent">ĐỘNG LỰC HỌC TẾ BÀO</h2>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">Nhấn vào từng chủ đề dưới đây để phóng to chữ và nghiên cứu sâu cấu trúc khoa học.</p>
                    </div>
                  </div>

                  {/* DANH SÁCH KHÁI NIỆM - CHỮ TO, ẤN VÀO RA CHI TIẾT */}
                  <div className="space-y-3">
                    
                    {/* KHÁI NIỆM 1 */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all">
                      <button 
                        onClick={() => setExpandedConcept(expandedConcept === 'concept1' ? null : 'concept1')}
                        className="w-full p-5 text-left flex justify-between items-center bg-slate-950/40 hover:bg-slate-950/80 transition-colors"
                      >
                        <span className="text-lg sm:text-xl font-extrabold text-teal-400">1. Chu Kì Tế Bào & Điểm Kiểm Soát (Checkpoint)</span>
                        <span className="text-lg text-slate-500">{expandedConcept === 'concept1' ? '▼' : '▶'}</span>
                      </button>
                      {expandedConcept === 'concept1' && (
                        <div className="p-5 border-t border-slate-800 bg-slate-950 text-slate-300 space-y-3 text-sm leading-relaxed animate-fadeIn">
                          <p className="font-bold text-slate-200 text-base">Chu kì tế bào là khoảng thời gian từ khi tế bào được sinh ra đến lần phân chia tiếp theo.</p>
                          <p>Bao gồm 2 giai đoạn cốt lõi: Kì trung gian (Pha G1 - Tế bào lớn lên, Pha S - Nhân đôi ADN, Pha G2 - Tổng hợp protein Tubulin) và Pha phân bào M.</p>
                          <p className="text-amber-400 font-medium">Hệ thống được điều khiển chặt chẽ bởi 3 Checkpoint chính (G1, G2/M, Thoi phân bào M). Nếu tế bào lỗi vượt qua điểm kiểm soát sẽ biến đổi thành tế bào ung thư tạo khối u di căn.</p>
                        </div>
                      )}
                    </div>

                    {/* KHÁI NIỆM 2 */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all">
                      <button 
                        onClick={() => setExpandedConcept(expandedConcept === 'concept2' ? null : 'concept2')}
                        className="w-full p-5 text-left flex justify-between items-center bg-slate-950/40 hover:bg-slate-950/80 transition-colors"
                      >
                        <span className="text-lg sm:text-xl font-extrabold text-indigo-400">2. Diễn Biến Bản Chất Nguyên Phân (Mitosis)</span>
                        <span className="text-lg text-slate-500">{expandedConcept === 'concept2' ? '▼' : '▶'}</span>
                      </button>
                      {expandedConcept === 'concept2' && (
                        <div className="p-5 border-t border-slate-800 bg-slate-950 text-slate-300 space-y-3 text-sm leading-relaxed animate-fadeIn">
                          <p className="font-bold text-slate-200 text-base">Xảy ra ở tế bào sinh dưỡng (xôma) và tế bào sinh dục sơ khai.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800"><b className="text-slate-100 block mb-0.5">Kì đầu:</b> NST kép bắt đầu co xoắn, màng nhân biến mất hoàn toàn, thoi vô sắc xuất hiện.</div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800"><b className="text-slate-100 block mb-0.5">Kì giữa:</b> NST co xoắn cực đại, tập trung xếp thành 1 hàng thẳng tắp ở mặt phẳng xích đạo.</div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800"><b className="text-slate-100 block mb-0.5">Kì sau:</b> Tâm động tách đôi, kéo 2 chromatid chị em phân li thành NST đơn di chuyển về 2 cực.</div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800"><b className="text-slate-100 block mb-0.5">Kì cuối:</b> Màng nhân tái xuất hiện, NST dãn xoắn, phân chia tế bào chất hình thành 2 tế bào con 2n giống hệt mẹ.</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* KHÁI NIỆM 3 */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all">
                      <button 
                        onClick={() => setExpandedConcept(expandedConcept === 'concept3' ? null : 'concept3')}
                        className="w-full p-5 text-left flex justify-between items-center bg-slate-950/40 hover:bg-slate-950/80 transition-colors"
                      >
                        <span className="text-lg sm:text-xl font-extrabold text-amber-400">3. Diễn Biến Bản Chất Giảm Phân (Meiosis)</span>
                        <span className="text-lg text-slate-500">{expandedConcept === 'concept3' ? '▼' : '▶'}</span>
                      </button>
                      {expandedConcept === 'concept3' && (
                        <div className="p-5 border-t border-slate-800 bg-slate-950 text-slate-300 space-y-3 text-sm leading-relaxed animate-fadeIn">
                          <p className="font-bold text-slate-200 text-base">Xảy ra tại tế bào sinh dục chín gồm 2 lần phân chia liên tiếp nhưng chỉ nhân đôi ADN duy nhất 1 lần ban đầu.</p>
                          <p><b className="text-amber-400">Kì đầu I:</b> Diễn ra hiện tượng tiếp hợp và trao đổi chéo (Crossing-over) giữa các chromatid khác nguồn gốc thuộc cặp tương đồng, tạo biến dị tổ hợp phong phú.</p>
                          <p><b className="text-amber-400">Kì giữa I:</b> NST kép tập trung thành 2 hàng song song trên mặt phẳng xích đạo. Kết thúc giảm phân tạo ra 4 giao tử mang bộ NST đơn bội n giảm đi một nửa.</p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 2: THƯ VIỆN VIDEO ĐÃ XEM ĐƯỢC VIDEO THỰC TẾ TRÊN WEB */}
              {activeTab === 'videos' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex justify-between items-end mb-6 border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-xl font-bold">Thư Viện Bài Giảng & Phim Mô Phỏng</h2>
                      <p className="text-xs text-slate-400 mt-1">Chọn một video bên dưới để khởi chạy trình phát đa phương tiện trực tiếp.</p>
                    </div>
                    <span className="text-xs font-mono bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">{allVideos.length} Video Trực Quan</span>
                  </div>

                  {/* TRÌNH PHÁT VIDEO CHUYÊN NGHIỆP HIỆN TRÊN WEB KHI ẤN XEM */}
                  {playingVideoUrl && (
                    <div className="mb-6 p-4 bg-slate-950 border-2 border-teal-500/30 rounded-2xl animate-fadeIn space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-teal-400">🎬 Đang phát: {playingVideoTitle}</span>
                        <button onClick={() => setPlayingVideoUrl(null)} className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded hover:bg-rose-500 hover:text-slate-950 font-bold transition-all">Tắt trình phát</button>
                      </div>
                      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                        {isYouTubeUrl(playingVideoUrl) ? (
                          <iframe
                            src={toYouTubeEmbed(playingVideoUrl) + (toYouTubeEmbed(playingVideoUrl).includes('?') ? '&' : '?') + 'autoplay=1&rel=0'}
                            title={playingVideoTitle}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                            frameBorder="0"
                          />
                        ) : (
                          <video src={playingVideoUrl} controls autoPlay className="w-full h-full object-contain bg-black"></video>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {allVideos.map(video => (
                    <div 
                        key={video.id} 
                        onClick={() => {
                          setPlayingVideoUrl(video.url);
                          setPlayingVideoTitle(video.title);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className={`bg-slate-950 border rounded-xl overflow-hidden group cursor-pointer hover:border-teal-500/50 transition-all ${playingVideoTitle === video.title ? 'border-teal-400 ring-1 ring-teal-400/30' : 'border-slate-800'}`}
                      >
                        <div className="aspect-video bg-slate-800 relative flex flex-col items-center justify-center overflow-hidden">
                          {isYouTubeUrl(video.url) ? (
                            (() => {
                              const m = toYouTubeEmbed(video.url).match(/embed\/([\w-]+)/);
                              const id = m?.[1];
                              return id ? (
                                <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={video.title} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" loading="lazy" />
                              ) : <span className="text-3xl opacity-60">{video.thumb}</span>;
                            })()
                          ) : (
                            <span className="text-3xl opacity-60 group-hover:scale-110 transition-transform duration-300">{video.thumb}</span>
                          )}
                          <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">{video.duration}</div>
                          <div className="absolute inset-0 bg-teal-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="w-9 h-9 bg-teal-400 text-slate-950 rounded-full flex items-center justify-center pl-0.5 text-xs font-bold shadow-lg">▶ Xem</div>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-950">
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">{video.topic}</span>
                          <h3 className="text-xs font-bold text-slate-200 mt-0.5 line-clamp-2 leading-relaxed group-hover:text-teal-400 transition-colors">{video.title}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: TRẮC NGHIỆM */}
              {activeTab === 'quiz' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                  {!quizComplete ? (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-bold">Phần chuyên sâu: {quizOrder[quizIndex].topic}</span>
                        <span className="font-mono text-slate-400">Câu hỏi: {quizIndex + 1} / {quizOrder.length}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <p className="text-sm sm:text-base font-bold text-slate-100 leading-relaxed">{quizOrder[quizIndex].question}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {quizOrder[quizIndex].options.map((option, idx) => {
                          let btnStyle = "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700";
                          if (isAnswered) {
                            if (option === quizOrder[quizIndex].answer) btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold";
                            else if (option === selectedAnswer) btnStyle = "bg-rose-500/20 border-rose-500 text-rose-400";
                            else btnStyle = "bg-slate-950/40 border-slate-900 text-slate-600 opacity-60";
                          }
                          return (
                            <button key={idx} onClick={() => handleOptionSelect(option)} disabled={isAnswered} className={`w-full p-4 rounded-xl text-left border text-xs sm:text-sm transition-all ${btnStyle}`}>
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      {isAnswered && (
                        <div className="flex justify-end pt-2">
                          <button onClick={handleNextQuestion} className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-indigo-500 text-slate-950 text-xs font-bold shadow-lg">
                            {quizIndex === quizOrder.length - 1 ? "Xem Tổng Kết Điểm" : "Câu Tiếp Theo →"}
                          </button>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <button
                          onClick={handleAiSolveQuiz}
                          disabled={aiQuizLoading}
                          className="w-full px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/40 text-indigo-300 text-xs font-bold hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                        >
                          {aiQuizLoading ? '🧠 AI đang suy luận...' : '🧠 Nhờ AI giải câu này'}
                        </button>
                        {aiQuizHint && (
                          <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-slate-200 leading-relaxed">
                            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:text-teal-300 prose-code:text-amber-300 prose-code:bg-slate-900 prose-code:px-1 prose-code:rounded prose-a:text-teal-400">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiQuizHint}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-3xl">🏆</div>
                      <h3 className="text-xl font-bold">Hoàn Thành Đợt Khảo Sát Thử Thách!</h3>
                      <div className="max-w-xs mx-auto p-4 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-xs text-slate-500">Kết quả đạt được</span>
                        <p className="text-3xl font-black text-teal-400 mt-1">{score} / {quizOrder.length}</p>
                      </div>
                      <button onClick={restartQuiz} className="px-5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold transition-all hover:bg-slate-700">Làm lại từ đầu</button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BẢNG XẾP HẠNG SẠCH SẼ - ĐÃ XOÁ BỎ HOÀN TOÀN CÁC TÊN GIẢ LẬP ẢO */}
              {activeTab === 'leaderboard' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-amber-400">🏆 Bảng Vàng Kỷ Lục Sinh Học Thực Tế</h3>
                  <p className="text-xs text-slate-400 mb-4">Danh sách ghi nhận điểm số từ những học viên thực tế tham gia ôn tập trên máy tính này.</p>
                  
                  {sortedLeaderboard.length === 0 ? (
                    <div className="text-center py-8 bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs italic">
                      Chưa có ai ghi tên vào bảng xếp hạng. Hãy hoàn thành trắc nghiệm để lưu tên bạn!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="pb-3 font-semibold">Hạng</th>
                            <th className="pb-3 font-semibold">Học Viên</th>
                            <th className="pb-3 font-semibold">Học Vị / Danh Hiệu Đạt Được</th>
                            <th className="pb-3 font-semibold">Huy Hiệu Gắn Kèm</th>
                            <th className="pb-3 font-semibold text-right">Kỷ Lục Điểm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {sortedLeaderboard.map((user, index) => (
                            <tr key={index} className={`hover:bg-slate-800/30 ${user.username === currentUser?.username ? 'bg-indigo-500/5' : ''}`}>
                              <td className="py-3 font-mono font-bold text-slate-400">#{index + 1}</td>
                              <td className="py-3 font-bold text-slate-200">
                                {user.real_name || user.username} <span className="text-[9px] text-slate-500">@{user.username}</span>
                                {user.role === 'admin' && <span className="text-[9px] bg-amber-500 text-slate-950 font-extrabold px-1 rounded ml-1">ADMIN</span>}
                                {user.username === currentUser?.username && <span className="text-[9px] bg-teal-500 text-slate-950 font-extrabold px-1 rounded ml-1">BẠN</span>}
                              </td>
                              <td className="py-3 text-amber-400 font-bold">{user.title}</td>
                              <td className="py-3 text-sm tracking-wide">{user.badges?.join(' ')}</td>
                              <td className="py-3 font-mono font-bold text-teal-400 text-right">{user.score} / 90</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: HỒ SƠ & TOÀN BỘ 30 DANH HIỆU/HUY HIỆU ĐỒ SỘ */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">👤 Quản Lý Định Danh</h3>
                      <input type="text" defaultValue={currentUser?.real_name} onBlur={(e) => handleUpdateNickname(e.target.value)} placeholder="Sửa tên hiển thị..." className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-teal-400" />
                      <p className="text-[10px] text-slate-500">Username: @{currentUser?.username} (không đổi được)</p>
                      <button onClick={handleResetData} className="w-full text-left p-2.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold hover:bg-rose-500/20 transition-all">🔄 Reset toàn bộ điểm số & huy hiệu</button>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 md:col-span-2">
                      <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">🔐 Đổi Mật Khẩu</h3>
                      <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="password"
                          value={pwdOld}
                          onChange={(e) => setPwdOld(e.target.value)}
                          placeholder="Mật khẩu cũ"
                          autoComplete="current-password"
                          className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-teal-400"
                        />
                        <input
                          type="password"
                          value={pwdNew}
                          onChange={(e) => setPwdNew(e.target.value)}
                          placeholder="Mật khẩu mới (6-72 ký tự)"
                          autoComplete="new-password"
                          minLength={6}
                          maxLength={72}
                          className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-teal-400"
                        />
                        <input
                          type="password"
                          value={pwdNew2}
                          onChange={(e) => setPwdNew2(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          autoComplete="new-password"
                          minLength={6}
                          maxLength={72}
                          className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-teal-400"
                        />
                        <button
                          type="submit"
                          disabled={pwdLoading}
                          className="md:col-span-3 w-full p-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {pwdLoading ? 'Đang cập nhật...' : '🔒 Cập nhật mật khẩu'}
                        </button>
                      </form>
                      {pwdMsg && (
                        <p className={`text-[11px] font-bold ${pwdMsg.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pwdMsg.text}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        Mật khẩu được mã hoá bằng bcrypt phía server. Mật khẩu cũ phải đúng thì mới đổi được.
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">🎛️ Tùy Chỉnh Giao Diện</h3>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Âm lượng guitar rải không gian</label>
                        <input type="range" min="0" max="100" value={bgVolume} onChange={(e) => setBgVolume(Number(e.target.value))} className="w-full accent-teal-400 bg-slate-950 rounded-lg h-1.5" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-bold pt-1">
                          <button onClick={() => setThemeStyle('slate')} className={`p-2 rounded-lg border ${themeStyle === 'slate' ? 'bg-teal-500 text-slate-950 border-teal-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Mặc định</button>
                          <button onClick={() => setThemeStyle('ocean')} className={`p-2 rounded-lg border ${themeStyle === 'ocean' ? 'bg-blue-700 text-blue-100 border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Đại dương</button>
                          <button onClick={() => setThemeStyle('emerald')} className={`p-2 rounded-lg border ${themeStyle === 'emerald' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Lục bảo</button>
                      </div>
                    </div>
                  </div>

                  {/* DANH SÁCH 15 HUY HIỆU */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3 mb-4">
                      🏅 Đại Kho Tàng Huy Hiệu Thành Tích {isAdmin && <span className="text-amber-400">+ Đặc Quyền Admin</span>}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {[...BADGES_LIST, ...(isAdmin ? ADMIN_BADGES_LIST : [])].map((badge) => {
                        const isAdminBadge = ADMIN_BADGES_LIST.some(b => b.icon === badge.icon);
                        // Admin chỉ tự động mở các huy hiệu đặc quyền admin.
                        // Huy hiệu thường vẫn phải đạt điểm như user bình thường.
                        const hasBadge = isAdminBadge
                          ? isAdmin
                          : !!currentUser?.badges?.includes(badge.icon);
                        return (
                          <div key={badge.id} className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-950 transition-all ${isAdminBadge ? 'border-amber-500/50 bg-amber-500/[0.04]' : hasBadge ? 'border-teal-500/40 bg-teal-500/[0.02]' : 'border-slate-900 opacity-30'}`}>
                            <div className="text-2xl">{badge.icon}</div>
                            <div>
                              <p className="font-bold text-slate-200">{badge.name}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{badge.desc}</p>
                            </div>
                            {isAdminBadge ? <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-400 font-extrabold px-1.5 py-0.5 rounded uppercase">Admin</span> : hasBadge ? <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded uppercase">Đã mở</span> : <span className="ml-auto text-[9px] bg-slate-800 text-slate-500 font-medium px-1.5 py-0.5 rounded">Khóa</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: TRỢ LÝ BIOSEA AI */}
              {activeTab === 'ai-chat' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col h-[480px]">
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs sm:text-sm scroll-smooth">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${msg.role === 'user' ? 'bg-teal-500 text-slate-950 font-bold whitespace-pre-wrap' : 'bg-slate-950 border border-slate-800 text-slate-200'}`}>
                          {msg.role === 'user' ? msg.text : (
                            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:text-teal-300 prose-code:text-amber-300 prose-code:bg-slate-900 prose-code:px-1 prose-code:rounded prose-a:text-teal-400">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isAiLoading && <div className="text-xs text-slate-500 animate-pulse">⚡ BIOSEA AI đang kết nối OpenAI API để phản hồi...</div>}
                  </div>
                  <form onSubmit={handleSendAiMessage} className="mt-4 flex gap-2">
                    <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Hỏi AI về Kì đầu, kì giữa, checkpoints..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-100" />
                    <button type="submit" disabled={isAiLoading || !aiInput.trim()} className="px-4 py-2 bg-teal-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-300">Gửi</button>
                  </form>
                </div>
              )}

              {/* TAB 7: ADMIN */}
              {activeTab === 'admin' && (
                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-5">
                  <div className="border-b border-slate-800 pb-3">
                    <h2 className="text-lg font-black text-amber-400">🔐 Bảng Điều Khiển Admin</h2>
                    <p className="text-xs text-slate-400 mt-1">Cấu hình nhạc nền, video, PDF dùng chung cho TẤT CẢ người dùng.</p>
                  </div>
                  {!isAdmin ? (
                    <div className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                      🚫 Bạn không có quyền Admin. Chỉ tài khoản đăng ký đầu tiên với username "admin" mới có quyền truy cập khu vực này.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {adminMsg && <div className="text-xs p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300">{adminMsg}</div>}

                      <section className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                        <h3 className="text-sm font-bold text-teal-400">🎵 Nhạc nền chung</h3>
                        <p className="text-[11px] text-slate-400">Hiện tại: {appSettings.music_url ? appSettings.music_title : 'Chưa thiết lập'}</p>
                        <input type="file" accept="audio/*" onChange={handleUploadMusic} disabled={uploadingMusic} className="text-xs text-slate-300" />
                      </section>

                       <section className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                         <h3 className="text-sm font-bold text-indigo-400">📄 Tài liệu chung (mọi định dạng)</h3>
                         <p className="text-[11px] text-slate-400">Hiện tại: {appSettings.pdf_url ? appSettings.pdf_name : 'Chưa thiết lập'}</p>
                         <input type="file" onChange={handleUploadPdf} disabled={uploadingPdf} className="text-xs text-slate-300" />
                         <p className="text-[10px] text-slate-500">Hỗ trợ PDF, DOCX, PPTX, hình ảnh, video, audio... Người dùng có thể xem thử hoặc tải về.</p>
                       </section>

                      <section className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                        <h3 className="text-sm font-bold text-rose-400">🎬 Video do Admin thêm ({(appSettings.videos||[]).length})</h3>
                        <VideoAdminForm onUploadFile={handleUploadVideoFile} onAddUrl={handleAddVideo} />
                        <div className="space-y-1">
                          {(appSettings.videos || []).map(v => (
                            <div key={v.id} className="flex items-center justify-between text-xs bg-slate-900 border border-slate-800 rounded-lg p-2">
                              <span className="truncate pr-2">🎬 {v.title}</span>
                              <button onClick={() => handleDeleteVideo(v.id)} className="text-rose-400 text-[10px] font-bold">Xóa</button>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-teal-400">📺 Chỉnh sửa trực tiếp 15 video mặc định ({(appSettings.default_videos||[]).length})</h3>
                          <button onClick={handleAddDefaultVideo} className="text-[10px] bg-teal-500 text-slate-950 font-bold px-2 py-1 rounded">+ Thêm</button>
                        </div>
                        <p className="text-[10px] text-slate-500">Sửa tiêu đề / URL / chủ đề rồi bấm 💾 — thay đổi áp dụng cho TẤT CẢ người dùng.</p>
                        <div className="space-y-2 max-h-[480px] overflow-y-auto">
                          {(appSettings.default_videos || []).map(v => (
                            <DefaultVideoRow key={v.id} video={v} onSave={handleSaveDefaultVideo} onDelete={handleDeleteDefaultVideo} />
                          ))}
                        </div>
                      </section>

                      <section className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                        <h3 className="text-sm font-bold text-amber-400">👥 Quản lý học viên ({accountsList.length})</h3>
                        <div className="space-y-1 max-h-80 overflow-y-auto">
                          {accountsList.map(acc => (
                            <div key={acc.id} className="flex items-center justify-between text-xs bg-slate-900 border border-slate-800 rounded-lg p-2">
                              <div className="truncate pr-2">
                                <span className="font-bold text-slate-200">{acc.real_name}</span>
                                <span className="text-slate-500"> @{acc.username}</span>
                                {acc.role === 'admin' && <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded ml-1 font-bold">ADMIN</span>}
                                <div className="text-[10px] text-slate-500">Điểm: {acc.score} · {acc.title}</div>
                              </div>
                              {acc.id !== currentUser?.id && (
                                <button onClick={() => handleDeleteAccount(acc.id, acc.username)} className="text-rose-400 text-[10px] font-bold bg-rose-500/10 px-2 py-1 rounded hover:bg-rose-500 hover:text-slate-950">Xóa</button>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="bg-slate-950 border border-rose-500/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-rose-400">📨 Hộp thư hỗ trợ ({adminTickets.length})</h3>
                          <span className="text-[10px] text-amber-400 font-bold">Mới: {adminTickets.filter(t => t.status === 'open').length}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Tin nhắn từ người dùng khi AI không xử lý được. Trả lời để người dùng nhận ngay trong bong bóng chat.</p>
                        <div className="space-y-2 max-h-[520px] overflow-y-auto">
                          {adminTickets.length === 0 && <div className="text-xs text-slate-500 italic p-3">Chưa có tin nhắn nào.</div>}
                          {adminTickets.map(t => (
                            <div key={t.id} className={`p-3 rounded-xl border ${t.status === 'open' ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-800 bg-slate-900'}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs">
                                  <span className="font-bold text-slate-100">{t.real_name || t.username}</span>
                                  <span className="text-slate-500"> @{t.username}</span>
                                  <span className={`ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${t.status === 'open' ? 'bg-rose-500 text-slate-950' : 'bg-emerald-500/20 text-emerald-400'}`}>{t.status === 'open' ? 'MỚI' : 'ĐÃ TRẢ LỜI'}</span>
                                </div>
                                <button onClick={() => handleDeleteTicket(t.id)} className="text-rose-400 text-[10px] font-bold">Xoá</button>
                              </div>
                              <div className="text-[10px] text-slate-500 mb-1">{new Date(t.created_at).toLocaleString('vi-VN')}</div>
                              <div className="text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded p-2 whitespace-pre-wrap">{t.message}</div>
                              {t.reply && (
                                <div className="mt-2 text-xs text-emerald-300 bg-emerald-500/5 border border-emerald-500/30 rounded p-2 whitespace-pre-wrap">
                                  <span className="text-[10px] font-bold text-emerald-400">↳ Phản hồi:</span> {t.reply}
                                </div>
                              )}
                              <div className="mt-2 flex gap-2">
                                <textarea
                                  value={adminReplyDraft[t.id] || ''}
                                  onChange={(e) => setAdminReplyDraft(prev => ({ ...prev, [t.id]: e.target.value }))}
                                  placeholder={t.reply ? 'Cập nhật phản hồi…' : 'Nhập phản hồi cho người dùng…'}
                                  rows={2}
                                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100"
                                />
                                <button onClick={() => handleAdminReply(t)} className="px-3 py-1.5 bg-emerald-500 text-slate-950 text-xs font-bold rounded self-end">Gửi</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              )}
            </>
        </div>

        {/* CỘT PHẢI ĐỀ XUẤT HỌC TẬP CỐ ĐỊNH */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase">Học liệu đi kèm</span>
              <h3 className="text-sm font-bold mt-1">Tài Nguyên Tải Về</h3>
            </div>
            <div onClick={() => setActiveTab('videos')} className="aspect-video bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group cursor-pointer hover:border-teal-500/50">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-xs font-bold mb-2 group-hover:scale-110 transition-transform">▶</div>
              <p className="text-xs font-bold text-slate-300">Xem video 3D mượt mà ngay trên tab Thư Viện</p>
            </div>
            <div className="space-y-2 text-xs">
              {appSettings.pdf_url ? (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 truncate flex-1">📄 {appSettings.pdf_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewFile({ url: appSettings.pdf_url, name: appSettings.pdf_name })}
                      className="flex-1 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 font-bold rounded-lg hover:bg-indigo-500 hover:text-slate-950 transition-all border border-indigo-500/40"
                    >
                      👁️ Xem thử
                    </button>
                    <a
                      href={appSettings.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={appSettings.pdf_name}
                      className="flex-1 px-3 py-1.5 bg-teal-500/20 text-teal-300 font-bold rounded-lg hover:bg-teal-500 hover:text-slate-950 transition-all border border-teal-500/40 text-center"
                    >
                      ⬇️ Tải về
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 text-center italic">Admin chưa tải tài liệu</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL XEM THỬ TÀI LIỆU */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-slate-800 shrink-0">
              <p className="text-sm font-bold text-slate-200 truncate pr-2">📄 {previewFile.name}</p>
              <div className="flex items-center gap-2 shrink-0">
                <a href={previewFile.url} target="_blank" rel="noopener noreferrer" download={previewFile.name} className="text-[11px] bg-teal-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg hover:bg-teal-400">⬇️ Tải về</a>
                <button onClick={() => setPreviewFile(null)} className="text-[11px] bg-rose-500/20 text-rose-300 font-bold px-3 py-1.5 rounded-lg hover:bg-rose-500 hover:text-slate-950">✕ Đóng</button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 overflow-auto">
              {(() => {
                const url = previewFile.url;
                const name = (previewFile.name || '').toLowerCase();
                const ext = name.split('.').pop();
                const isImage = ['png','jpg','jpeg','gif','webp','svg','bmp'].includes(ext);
                const isVideo = ['mp4','webm','ogg','mov','m4v'].includes(ext);
                const isAudio = ['mp3','wav','ogg','m4a','aac','flac'].includes(ext);
                const isPdf = ext === 'pdf';
                const isOffice = ['doc','docx','xls','xlsx','ppt','pptx'].includes(ext);
                if (isImage) return <img src={url} alt={previewFile.name} className="max-w-full max-h-full mx-auto object-contain" />;
                if (isVideo) return <video src={url} controls className="w-full h-full bg-black" />;
                if (isAudio) return <div className="p-6 flex items-center justify-center h-full"><audio src={url} controls className="w-full max-w-md" /></div>;
                if (isPdf) return <iframe src={url} title={previewFile.name} className="w-full h-full" />;
                if (isOffice) return <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`} title={previewFile.name} className="w-full h-full bg-white" />;
                return (
                  <div className="p-6 text-center text-slate-400 text-sm space-y-3 h-full flex flex-col items-center justify-center">
                    <p>📦 Không thể xem trực tiếp định dạng <span className="text-teal-400 font-bold">.{ext}</span></p>
                    <a href={url} target="_blank" rel="noopener noreferrer" download={previewFile.name} className="px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-lg">⬇️ Tải về để mở</a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 🆘 BONG BÓNG HỖ TRỢ AI + NHẮN ADMIN */}
      <button
        onClick={() => setSupportOpen(v => !v)}
        className="fixed bottom-5 right-5 z-[90] w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 text-slate-950 text-2xl shadow-2xl shadow-teal-500/30 hover:scale-110 transition-transform flex items-center justify-center"
        aria-label="Mở hỗ trợ"
        title="Hỗ trợ AI / Nhắn Admin"
      >
        {supportOpen ? '✕' : '💬'}
        {!supportOpen && myTickets.some(t => t.status === 'answered' && t.reply) && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">!</span>
        )}
      </button>
      {supportOpen && (
        <div className="fixed bottom-24 right-5 z-[95] w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-950 flex items-center gap-1">
            <button onClick={() => setSupportMode('ai')} className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold ${supportMode==='ai' ? 'bg-teal-500 text-slate-950' : 'text-slate-400'}`}>🤖 AI Hỗ Trợ</button>
            <button onClick={() => setSupportMode('admin')} className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold ${supportMode==='admin' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>
              📨 Nhắn Admin
              {myTickets.some(t => t.status === 'answered' && t.reply) && <span className="ml-1 inline-block w-1.5 h-1.5 bg-rose-500 rounded-full" />}
            </button>
          </div>

          {supportMode === 'ai' && (
            <>
              <div ref={supportScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                {supportMessages.length === 0 && (
                  <div className="text-slate-400 leading-relaxed p-2">
                    👋 Xin chào! Mình là <b className="text-teal-400">BIOSEA SUPPORT</b>. Mô tả lỗi/khó khăn bạn đang gặp khi dùng app, mình sẽ hướng dẫn ngay.
                    <div className="mt-2 text-[10px] text-slate-500 italic">Nếu vấn đề vượt quyền hạn AI, chuyển sang tab <b className="text-amber-400">📨 Nhắn Admin</b>.</div>
                  </div>
                )}
                {supportMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-xl p-2.5 ${m.role === 'user' ? 'bg-teal-500 text-slate-950 font-bold whitespace-pre-wrap' : 'bg-slate-950 border border-slate-800 text-slate-200'}`}>
                      {m.role === 'user' ? m.text : (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text || '…'}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSupportAi} className="p-2 border-t border-slate-800 flex gap-2">
                <input
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  placeholder="Mô tả lỗi bạn đang gặp…"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
                <button type="submit" disabled={supportLoading || !supportInput.trim()} className="px-3 py-2 bg-teal-500 text-slate-950 text-xs font-bold rounded-lg disabled:opacity-40">
                  {supportLoading ? '…' : 'Gửi'}
                </button>
              </form>
            </>
          )}

          {supportMode === 'admin' && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                <div className="text-[11px] text-slate-400 bg-amber-500/5 border border-amber-500/30 rounded-lg p-2">
                  📨 Gửi trực tiếp cho Quản trị viên. Dùng khi AI không xử lý được (khôi phục mật khẩu, lỗi dữ liệu, khiếu nại điểm…).
                </div>
                {myTickets.length === 0 && <div className="text-slate-500 italic p-2">Bạn chưa gửi tin nhắn nào cho Admin.</div>}
                {myTickets.map(t => (
                  <div key={t.id} className="space-y-1">
                    <div className="flex justify-end">
                      <div className="max-w-[88%] rounded-xl p-2.5 bg-amber-500 text-slate-950 font-bold whitespace-pre-wrap">{t.message}</div>
                    </div>
                    <div className="text-[9px] text-slate-500 text-right">{new Date(t.created_at).toLocaleString('vi-VN')} · {t.status === 'open' ? '⏳ Chờ Admin' : '✅ Đã trả lời'}</div>
                    {t.reply && (
                      <div className="flex justify-start">
                        <div className="max-w-[88%] rounded-xl p-2.5 bg-slate-950 border border-emerald-500/40 text-emerald-200 whitespace-pre-wrap">
                          <div className="text-[9px] font-bold text-emerald-400 mb-1">🛡️ ADMIN trả lời:</div>
                          {t.reply}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {supportSentMsg && <div className="px-3 py-1 text-[11px] text-emerald-400 bg-emerald-500/5 border-t border-emerald-500/20">{supportSentMsg}</div>}
              <form onSubmit={handleSendToAdmin} className="p-2 border-t border-slate-800 flex gap-2">
                <input
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  placeholder="Tin nhắn gửi Admin…"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
                <button type="submit" disabled={supportLoading || !supportInput.trim()} className="px-3 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg disabled:opacity-40">
                  Gửi
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
