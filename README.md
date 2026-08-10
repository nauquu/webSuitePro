# Web Suite Pro ⚡

Bộ tiện ích mở rộng đa năng cho trình duyệt Chromium (Chrome, Brave, Edge): Ẩn Quảng Cáo/Gợi ý Facebook, Chặn UID, Giải Captcha tự động (Buster Engine), YouTube NonStop, Quản lý Extension và Import Cookie.

## 🌟 Chức năng chính

### 1. Facebook Feed Cleaner & UID Hider
- **Chặn Quảng Cáo (FB Ad Blocker)**: Tự động ẩn bài viết nhãn "Ad", "Sponsored", "Được tài trợ", "Quảng cáo". Giải mã thẻ span obfuscated và thuộc tính CSS flexbox order.
- **Ẩn Page chưa Follow**: Tự động ẩn bài viết từ Page gợi ý ("Follow", "Theo dõi", "Suggested for you").
- **Ẩn Group chưa Join**: Tự động ẩn bài viết từ Group gợi ý ("Join", "Tham gia", "Suggested group").
- **Chặn bài theo UID (Blacklist)**: Nút thêm UID trực tiếp trên **Wall/Trang cá nhân** và Menu 3 chấm (`...`) của từng bài viết.
- **Bảo vệ Bình luận (Comment Safeguard)**: Tách biệt bộ lọc bài viết và bình luận, đảm bảo không bao giờ ẩn nhầm bình luận của người dùng.

### 2. Tự động giải Captcha (Buster Engine)
- Tự động phát hiện reCAPTCHA v2, hCaptcha và Facebook Security Captcha.
- Tự động chuyển sang thử thách Âm thanh (Audio Challenge), bóc tách file audio và sử dụng trí tuệ nhân tạo nhận dạng giọng nói thành văn bản để vượt qua Captcha tự động.

### 3. YouTube NonStop
- Tự động phát tiếp khi YouTube hiện thông báo *"Video đã tạm dừng. Bạn có muốn tiếp tục xem?"*.
- Giúp trải nghiệm xem video hoặc nghe nhạc không bị gián đoạn.

### 4. Trình Quản Lý Tiện Ích (Extension Manager)
- Giao diện trực quan với 2 vùng phân chia: **Đang bật** và **Đang tắt**.
- Click vào tiện ích để bật/tắt nhanh chóng.
- Rê chuột vào icon tiện ích xuất hiện nút **`✕`** đỏ để **Gỡ cài đặt nhanh (Quick Uninstall)**.
- Thao tác nhanh: **Bật tất cả**, **Tắt tất cả** và tìm kiếm tiện ích theo tên.

### 5. Import Cookie
- Hỗ trợ nhập Cookie chuẩn định dạng **String Header** (`c_user=...; xs=...`) và **JSON Array** (`Cookie-Editor`, `EditThisCookie`, `J2TEAM`).
- Tùy chỉnh domain nạp Cookie (`.facebook.com`, `.youtube.com`, `.google.com`...).

### 6. Hỗ trợ Side Panel (Sidebar) & Responsive UI
- Tích hợp nút chuyển nhanh sang **Thanh bên (Side Panel)** của trình duyệt Brave, Chrome, Edge.
- Giao diện co giãn chuẩn **100% Responsive**, không bị khoảng trắng hay lẹm viền.

## 🚀 Hướng dẫn Cài đặt

1. Tải repository này về máy hoặc clone qua Git:
   ```bash
   git clone https://github.com/nauquu/webSuitePro.git
   ```
2. Mở trình duyệt Chrome/Brave/Edge và truy cập: `chrome://extensions`.
3. Bật **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
4. Bấm **Load unpacked (Tải tiện ích đã giải nén)** và chọn thư mục `webSuitePro`.

## 📄 Giấy phép

MIT License.
