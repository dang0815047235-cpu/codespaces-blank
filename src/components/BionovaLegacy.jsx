import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// 🏅 HỆ THỐNG 15 DANH HIỆU NÂNG CẤP THEO TIẾN TRÌNH ĐIỂM
const GET_TITLE_BY_SCORE = (score) => {
  if (score >= 90) return "👑 Đại Đế Di Truyền";
  if (score >= 85) return "🪐 Học Giả Tế Bào Học";
  if (score >= 78) return "🌟 Giáo Sư Phân Bào";
  if (score >= 70) return "⚡ Đột Phá Giảm Phân";
  if (score >= 62) return "🏹 Chiến Binh Kì Sau II";
  if (score >= 55) return "🔮 Chỉ Huy Kì Giữa II";
  if (score >= 48) return "🧬 Kĩ Sư Trao Đổi Chéo";
  if (score >= 40) return "💠 Chuyên Gia Nguyên Phân";
  if (score >= 32) return "🚦 Trưởng Tháp Checkpoint";
  if (score >= 25) return "⏳ Trùm Cuối Pha G2";
  if (score >= 18) return "🧬 Thợ Săn Pha S";
  if (score >= 12) return "🌿 Mầm Sống Pha G1";
  if (score >= 6) return "🔬 Tập Sự Kính Hiển Vi";
  if (score >= 1) return "🌱 Hợp Tử Sơ Sinh";
  return "🥚 Tế Bào Sơ Cấp";
};

export default function App() {
  const [activeTab, setActiveTab] = useState('concepts');
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

  const [aiInput, setAiInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '🧬 Xin chào! Mình là BIOSEA AI - trợ lý học tập thông thái của hệ thống BIONOVA LEGACY. Hãy hỏi mình bất cứ điều gì về Chu kì tế bào, Nguyên phân và Giảm phân nhé! 🌿🧪' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Cấu hình do admin đặt (đồng bộ tất cả thiết bị)
  const [appSettings, setAppSettings] = useState({
    music_url: '',
    music_title: 'Nhạc nền hệ thống',
    pdf_url: '',
    pdf_name: 'Tai_lieu.pdf',
    videos: [],
    admin_password: 'bionova2026',
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState('');
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
        admin_password: data.admin_password || 'bionova2026',
      });
    }
  };

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard_entries')
      .select('username, score, title, badges')
      .order('score', { ascending: false })
      .limit(100);
    if (data) {
      setLeaderboard(data.map(d => ({ ...d, badges: Array.isArray(d.badges) ? d.badges : [] })));
    }
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard_entries' }, () => loadLeaderboard())
      .subscribe();

    const sessionUser = localStorage.getItem('biotech_current_user');
    if (sessionUser) {
      setCurrentUser(JSON.parse(sessionUser));
      setIsLoggedIn(true);
    }
    return () => {
      supabase.removeChannel(settingsCh);
      supabase.removeChannel(lbCh);
    };
  }, []);

  // 🔊 Nhạc nền: phát file do admin upload (mọi user nghe cùng nguồn)
  const toggleBackgroundMusic = async () => {
    if (!appSettings.music_url) {
      alert('Admin chưa thiết lập nhạc nền. Vào tab ⚙️ Admin để tải lên.');
      return;
    }
    if (!audioElRef.current) return;
    if (isPlayingAudio) {
      audioElRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      try {
        audioElRef.current.volume = bgVolume / 100;
        await audioElRef.current.play();
        setIsPlayingAudio(true);
        if (currentUser && !currentUser.badges.includes('📡')) {
          const updatedBadges = [...currentUser.badges, '📡'];
          const updatedUser = { ...currentUser, badges: updatedBadges };
          setCurrentUser(updatedUser);
          localStorage.setItem('biotech_current_user', JSON.stringify(updatedUser));
        }
      } catch (e) {
        alert('Không phát được nhạc: ' + e.message);
      }
    }
  };

  // Cập nhật âm lượng khi slider thay đổi
  useEffect(() => {
    if (audioElRef.current) audioElRef.current.volume = bgVolume / 100;
  }, [bgVolume]);

  // Đăng ký / Đăng nhập (đồng bộ Supabase)
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    const name = usernameInput.trim();
    const { data: existing } = await supabase
      .from('leaderboard_entries')
      .select('username, score, title, badges')
      .ilike('username', name)
      .maybeSingle();

    let loggedInUser;
    if (existing) {
      loggedInUser = { ...existing, badges: Array.isArray(existing.badges) ? existing.badges : ['🧫'] };
    } else {
      loggedInUser = { username: name, score: 0, title: GET_TITLE_BY_SCORE(0), badges: ['🧫'] };
      await supabase.from('leaderboard_entries').insert(loggedInUser);
      loadLeaderboard();
    }
    localStorage.setItem('biotech_current_user', JSON.stringify(loggedInUser));
    setCurrentUser(loggedInUser);
    setIsLoggedIn(true);
  };

  const handleUpdateNickname = async (newName) => {
    if (!newName.trim() || !currentUser) return;
    const name = newName.trim();
    if (name.toLowerCase() === currentUser.username.toLowerCase()) return;
    await supabase.from('leaderboard_entries')
      .update({ username: name })
      .ilike('username', currentUser.username);
    const updatedUser = { ...currentUser, username: name };
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

  const handleResetData = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn đặt lại toàn bộ tiến trình học tập của mình không?")) return;
    if (!currentUser) return;
    const resetUser = { ...currentUser, score: 0, title: GET_TITLE_BY_SCORE(0), badges: ['🧫'] };
    setCurrentUser(resetUser);
    localStorage.setItem('biotech_current_user', JSON.stringify(resetUser));
    await supabase.from('leaderboard_entries')
      .update({ score: 0, title: resetUser.title, badges: resetUser.badges })
      .ilike('username', currentUser.username);
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

    await supabase.from('leaderboard_entries')
      .upsert(
        { username: updatedUser.username, score: maxScore, title: newTitle, badges: updatedBadges },
        { onConflict: 'username' }
      );
    loadLeaderboard();
  };

  const handleOptionSelect = (option) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);
    if (option === QUIZ_QUESTIONS[quizIndex].answer) {
      setScore(prev => {
        const nextScore = prev + 1;
        if (isLoggedIn) updateGlobalStats(nextScore);
        return nextScore;
      });
    }
  };

  const handleNextQuestion = () => {
    if (quizIndex < QUIZ_QUESTIONS.length - 1) {
      setQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setQuizComplete(true);
    }
  };

  const restartQuiz = () => {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizComplete(false);
  };

  // Hệ thống Chat hỗ trợ AI
  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || isAiLoading) return;
    
    const userText = aiInput.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      // Đã bảo mật API Key cũ và xử lý gọi proxy/mock an toàn cho Client-side
      setTimeout(() => {
        let responseMock = `🧬 Trợ lý BIOSEA AI nhận định câu hỏi của bạn rất hay! Về cơ chế phân bào, bạn cần chú ý các mốc:\n- Kì giữa: NST đóng xoắn cực đại xếp 1 hàng (Nguyên phân) hoặc 2 hàng (Giảm phân I).\n- Cấu trúc Checkpoint G1 ngăn lỗi sao chép hiệu quả. 🧪`;
        setMessages(prev => [...prev, { role: 'assistant', text: responseMock }]);
        setIsAiLoading(false);
      }, 1000);
    } catch (error) {
      setIsAiLoading(false);
    }
  };

  const progressPercent = useMemo(() => Math.round(((quizIndex + 1) / QUIZ_QUESTIONS.length) * 100), [quizIndex]);
  const sortedLeaderboard = useMemo(() => [...leaderboard].sort((a, b) => b.score - a.score), [leaderboard]);
  
  const wrapperThemeClass = useMemo(() => {
    if (themeStyle === 'ocean') return 'bg-slate-950 text-sky-100';
    if (themeStyle === 'emerald') return 'bg-stone-950 text-emerald-100';
    return 'bg-slate-950 text-slate-100'; 
  }, [themeStyle]);

  const accentColorClass = useMemo(() => {
    if (themeStyle === 'ocean') return 'from-sky-400 to-blue-500 text-sky-400 border-sky-500';
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
              Chào mừng bạn đến với hệ thống khảo sát phân bào sinh học. Vui lòng khởi tạo biệt danh học viên để mở khóa toàn bộ tài nguyên trên trang web.
            </p>
          </div>
          <form onSubmit={handleAuth} action="#" method="post" className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider pl-1">Tên học viên / Biệt danh</label>
              <input 
                type="text" 
                required
                value={usernameInput} 
                onChange={(e) => setUsernameInput(e.target.value)} 
                placeholder="Ví dụ: Bẹp..." 
                maxLength={14} 
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 px-4 py-3 rounded-xl text-sm font-bold text-center text-slate-100 transition-all focus:outline-none placeholder-slate-600" 
              />
            </div>
            <button
              type="button"
              onClick={(e) => handleAuth(e)}
              className="w-full bg-gradient-to-r from-teal-400 to-indigo-500 hover:from-teal-300 hover:to-indigo-400 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all transform active:scale-98"
            >
              Kích Hoạt Tài Khoản & Vào Hệ Thống
            </button>
          </form>
          <div className="text-[10px] text-slate-500 font-medium pt-2">
            Hệ thống tự động đồng bộ huy hiệu & danh hiệu vào bộ nhớ cục bộ.
          </div>
        </div>
      </div>
    );
  }

  // GIAO DIỆN CHÍNH SAU KHI ĐÃ ĐĂNG KÝ THÀNH CÔNG
  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${wrapperThemeClass}`}>
      
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${accentColorClass.split(' text-')[0]} flex items-center justify-center shadow-lg`}>
            <span className="font-bold text-xl">🧫</span>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">BIONOVA LEGACY</h1>
            <p className="text-xs text-slate-400 font-medium">Hệ thống Khám phá Chu kì Tế bào & Phân bào</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleBackgroundMusic} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isPlayingAudio ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'}`}>
            {isPlayingAudio ? `👽 Homesick Alien: ${bgVolume}%` : '🔇 Nhạc nền: Tắt'}
          </button>
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <div className="text-right">
              <p className="text-xs font-bold text-teal-400">{currentUser?.username}</p>
              <p className="text-[10px] text-amber-400 font-bold">🎖️ {currentUser?.title}</p>
            </div>
            <button onClick={handleLogout} className="text-[10px] bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-slate-950 px-2 py-1 rounded font-bold transition-all">Đổi nick</button>
          </div>
        </div>
      </header>

      {/* TABS MENU */}
      <nav className="bg-slate-900 border-b border-slate-800 flex justify-center flex-wrap gap-1 p-2">
        <button onClick={() => setActiveTab('concepts')} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'concepts' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}>📚 Khái Niệm</button>
        <button onClick={() => setActiveTab('videos')} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'videos' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}>🎥 Thư Viện Video (15)</button>
        <button onClick={() => setActiveTab('quiz')} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'quiz' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}>✍️ Trắc Nghiệm (90 Câu)</button>
        <button onClick={() => setActiveTab('leaderboard')} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}>🏆 Bảng Xếp Hạng</button>
        <button onClick={() => setActiveTab('settings')} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>⚙️ Thành Tích ({currentUser?.badges?.length}/15)</button>
        <button onClick={() => setActiveTab('ai-chat')} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'ai-chat' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}>🤖 BIOSEA AI</button>
      </nav>

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
                    <span className="text-xs font-mono bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">15 Video Trực Quan</span>
                  </div>

                  {/* TRÌNH PHÁT VIDEO CHUYÊN NGHIỆP HIỆN TRÊN WEB KHI ẤN XEM */}
                  {playingVideoUrl && (
                    <div className="mb-6 p-4 bg-slate-950 border-2 border-teal-500/30 rounded-2xl animate-fadeIn space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-teal-400">🎬 Đang phát: {playingVideoTitle}</span>
                        <button onClick={() => setPlayingVideoUrl(null)} className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded hover:bg-rose-500 hover:text-slate-950 font-bold transition-all">Tắt trình phát</button>
                      </div>
                      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                        <video src={playingVideoUrl} controls autoPlay className="w-full h-full object-cover"></video>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {VIDEOS_LIST.map(video => (
                      <div 
                        key={video.id} 
                        onClick={() => {
                          setPlayingVideoUrl(video.url);
                          setPlayingVideoTitle(video.title);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className={`bg-slate-950 border rounded-xl overflow-hidden group cursor-pointer hover:border-teal-500/50 transition-all ${playingVideoTitle === video.title ? 'border-teal-400 ring-1 ring-teal-400/30' : 'border-slate-800'}`}
                      >
                        <div className="aspect-video bg-slate-800 relative flex flex-col items-center justify-center">
                          <span className="text-3xl opacity-60 group-hover:scale-110 transition-transform duration-300">{video.thumb}</span>
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
                        <span className="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-bold">Phần chuyên sâu: {QUIZ_QUESTIONS[quizIndex].topic}</span>
                        <span className="font-mono text-slate-400">Câu hỏi: {quizIndex + 1} / {QUIZ_QUESTIONS.length}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <p className="text-sm sm:text-base font-bold text-slate-100 leading-relaxed">{QUIZ_QUESTIONS[quizIndex].question}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {QUIZ_QUESTIONS[quizIndex].options.map((option, idx) => {
                          let btnStyle = "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700";
                          if (isAnswered) {
                            if (option === QUIZ_QUESTIONS[quizIndex].answer) btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold";
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
                            {quizIndex === QUIZ_QUESTIONS.length - 1 ? "Xem Tổng Kết Điểm" : "Câu Tiếp Theo →"}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-3xl">🏆</div>
                      <h3 className="text-xl font-bold">Hoàn Thành Đợt Khảo Sát Thử Thách!</h3>
                      <div className="max-w-xs mx-auto p-4 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-xs text-slate-500">Kết quả đạt được</span>
                        <p className="text-3xl font-black text-teal-400 mt-1">{score} / {QUIZ_QUESTIONS.length}</p>
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
                                {user.username} {user.username === currentUser?.username && <span className="text-[9px] bg-teal-500 text-slate-950 font-extrabold px-1 rounded ml-1">BẠN</span>}
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
                      <input type="text" defaultValue={currentUser?.username} onBlur={(e) => handleUpdateNickname(e.target.value)} placeholder="Sửa biệt danh hiển thị..." className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-teal-400" />
                      <button onClick={handleResetData} className="w-full text-left p-2.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold hover:bg-rose-500/20 transition-all">🔄 Reset toàn bộ điểm số & huy hiệu</button>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">🎛️ Tùy Chỉnh Giao Diện</h3>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Âm lượng guitar rải không gian</label>
                        <input type="range" min="0" max="100" value={bgVolume} onChange={(e) => setBgVolume(Number(e.target.value))} className="w-full accent-teal-400 bg-slate-950 rounded-lg h-1.5" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-bold pt-1">
                          <button onClick={() => setThemeStyle('slate')} className={`p-2 rounded-lg border ${themeStyle === 'slate' ? 'bg-teal-500 text-slate-950 border-teal-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Mặc định</button>
                          <button onClick={() => setThemeStyle('ocean')} className={`p-2 rounded-lg border ${themeStyle === 'ocean' ? 'bg-sky-500 text-slate-950 border-sky-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Đại dương</button>
                          <button onClick={() => setThemeStyle('emerald')} className={`p-2 rounded-lg border ${themeStyle === 'emerald' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Lục bảo</button>
                      </div>
                    </div>
                  </div>

                  {/* DANH SÁCH 15 HUY HIỆU */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3 mb-4">🏅 Đại Kho Tàng 15 Huy Hiệu Thành Tích Độc Quyền</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {BADGES_LIST.map((badge) => {
                        const hasBadge = currentUser?.badges?.includes(badge.icon);
                        return (
                          <div key={badge.id} className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-950 transition-all ${hasBadge ? 'border-teal-500/40 bg-teal-500/[0.02]' : 'border-slate-900 opacity-30'}`}>
                            <div className="text-2xl">{badge.icon}</div>
                            <div>
                              <p className="font-bold text-slate-200">{badge.name}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{badge.desc}</p>
                            </div>
                            {hasBadge ? <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded uppercase">Đã mở</span> : <span className="ml-auto text-[9px] bg-slate-800 text-slate-500 font-medium px-1.5 py-0.5 rounded">Khóa</span>}
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
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs sm:text-sm">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl p-3 leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-950 border border-slate-800 text-slate-200'}`}>
                          {msg.text}
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
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300 truncate pr-2">Bang_So_Sanh_Nguyen_Phan_Giam_Phan.pdf</span>
                <span className="text-teal-400 font-medium hover:underline cursor-pointer shrink-0">Tải về</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
