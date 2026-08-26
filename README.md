# MapViet Neon 🛰️

Ứng dụng bản đồ kiểu Google Maps, giao diện **neon tối** giống ảnh mẫu bạn gửi, dùng **Leaflet** (OpenStreetMap) cho phần bản đồ, có **backend + frontend** đầy đủ, **đăng nhập** (không có đăng ký công khai), **tài khoản Admin** quản lý toàn bộ tài khoản người dùng và **giới hạn tính năng** theo từng tài khoản.

## Tính năng

- 🔍 Tìm kiếm địa điểm / địa chỉ (Nominatim - OpenStreetMap)
- 📍 Định vị vị trí hiện tại của bạn (GPS trình duyệt)
- 🧭 Tìm đường đi **ngắn nhất** cho **ô tô** và **đi bộ** (OSRM), hiển thị quãng đường + thời gian ước tính
- ⭐ Lưu / xóa **địa điểm yêu thích** (bấm chuột phải trên bản đồ, hoặc từ kết quả tìm kiếm)
- 🔐 Đăng nhập bằng JWT, **không có trang đăng ký** — chỉ Admin được tạo tài khoản
- 🛡️ Trang **Quản Lý Tài Khoản** (chỉ Admin thấy được): tạo / sửa / khóa / xóa tài khoản, đổi vai trò, và **bật/tắt từng quyền tính năng** (tìm kiếm, tìm đường, định vị, yêu thích) cho từng người dùng
- 📱 Giao diện **responsive**: máy tính, tablet, điện thoại (sidebar thu gọn thành menu ☰ trên di động)
- 🎨 Giao diện neon tối: nền chòm sao chuyển động, viền phát sáng, gradient cyan/tím/hồng giống ảnh mẫu

## Tài khoản Admin mặc định

```
Tài khoản : tunglaihoclaptrinhmobile@1234
Mật khẩu  : TtungnguyenhoangNHmobile@142010
```

Tài khoản này được **tự động tạo khi khởi động server lần đầu** và **không thể bị xóa hoặc hạ quyền** (được đánh dấu là admin gốc). Chỉ tài khoản Admin (gốc hoặc admin khác do Admin gốc tạo) mới có quyền vào trang "Quản Lý Tài Khoản" để tạo thêm tài khoản mới — người dùng thường **không thể tự đăng ký**.

## Cài đặt & chạy thử (trên máy của bạn)

Yêu cầu: đã cài **Node.js phiên bản 18 trở lên** (có sẵn `fetch`).

```bash
# 1. Giải nén / vào thư mục dự án
cd mapviet

# 2. Cài thư viện backend
npm install

# 3. Chạy server
npm start
```

Sau đó mở trình duyệt tại: **http://localhost:3000**

Server sẽ tự tạo file dữ liệu tại `data/db.json` (đóng vai trò cơ sở dữ liệu) và tài khoản Admin ở trên nếu chưa có.

> Muốn đổi cổng chạy: `PORT=8080 npm start`

## Cấu trúc thư mục

```
mapviet/
  server.js              # Điểm khởi động Express
  src/
    store.js              # "Database" JSON: users, favorites
    auth.js                # Ký & xác minh JWT
    middleware.js           # Xác thực đăng nhập, kiểm tra quyền Admin/permission
    routes/
      auth.js               # POST /api/auth/login, GET /api/auth/me
      admin.js              # CRUD tài khoản (chỉ Admin)
      favorites.js          # CRUD địa điểm yêu thích (theo từng user)
      geo.js                # Proxy tìm kiếm (Nominatim) + tìm đường (OSRM)
  public/                  # Frontend tĩnh (HTML/CSS/JS thuần, không cần build)
    login.html
    index.html
    css/style.css
    js/{bg-canvas,api,login,app,map,admin}.js
  data/db.json             # Tự sinh khi chạy lần đầu
```

## Ghi chú kỹ thuật & bảo mật khi triển khai thật

- Mật khẩu được băm bằng `bcryptjs`, không lưu dạng thô.
- Đổi `JWT_SECRET` bằng biến môi trường khi đưa lên production (mặc định trong `src/auth.js` chỉ dùng để chạy thử).
- Dữ liệu lưu ở file JSON để dễ chạy ở bất kỳ máy nào không cần cài database ngoài. Nếu triển khai quy mô lớn, có thể thay `src/store.js` bằng PostgreSQL/MongoDB mà không cần đổi các route phía trên (giữ nguyên các hàm export).
- Tìm kiếm & tìm đường dùng dịch vụ **miễn phí** của OpenStreetMap (Nominatim) và **OSRM demo server** — phù hợp để học tập/demo. Nếu dùng cho sản phẩm thật với lượng truy cập lớn, nên đăng ký dịch vụ geocoding/routing trả phí (Mapbox, Google, GraphHopper...) để đảm bảo giới hạn tần suất.
- CORS đang mở cho mọi nguồn (`cors()`), nên giới hạn origin cụ thể khi triển khai thật.
