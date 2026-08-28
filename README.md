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

## Đưa lên Render.com (deploy)

Dự án đã có sẵn file **`render.yaml`** (Render Blueprint) để deploy chỉ với vài cú click.

**Bước 1 — Đẩy code lên Git**

Tạo một repo (GitHub/GitLab) và đẩy **toàn bộ nội dung thư mục `mapviet`** (bao gồm `server.js`, `package.json`, `src/`, `public/`, `render.yaml`) lên làm gốc repo đó. Không cần đẩy `node_modules/` hay `data/db.json` (đã có trong `.gitignore`).

```bash
cd mapviet
git init
git add .
git commit -m "MapViet Neon"
git branch -M main
git remote add origin <URL_repo_cua_ban>
git push -u origin main
```

**Bước 2 — Tạo Blueprint trên Render**

1. Đăng nhập [render.com](https://render.com) → **New** → **Blueprint**.
2. Chọn repo vừa đẩy lên. Render sẽ tự phát hiện `render.yaml`.
3. Bấm **Apply** — Render tự động: cài `npm install`, chạy `npm start`, tạo ổ đĩa lưu trữ bền vững (`disk`) cho thư mục `data/` để **dữ liệu tài khoản/yêu thích không bị mất mỗi lần deploy lại**, và tự sinh `JWT_SECRET` ngẫu nhiên an toàn.
4. Chờ build xong, mở đường dẫn dạng `https://mapviet-neon.onrender.com`.

**Nếu để trong monorepo** (thư mục `mapviet` nằm trong một repo lớn hơn): vào phần cấu hình service trên Render → **Settings → Root Directory** → nhập `mapviet`.

**Lưu ý gói Free**: service sẽ tự "ngủ" sau khoảng 15 phút không có ai truy cập, và mất khoảng 30–60 giây để "thức dậy" ở lượt truy cập kế tiếp. Đây là giới hạn của gói miễn phí Render, không phải lỗi ứng dụng.

**⚠️ Về việc lưu trữ dữ liệu trên gói Free**: Render **không hỗ trợ ổ đĩa bền vững (persistent disk) cho gói Free**, nên file `data/db.json` sẽ bị tạo lại (chỉ còn tài khoản Admin mặc định) mỗi khi service khởi động lại hoặc deploy lại — mọi tài khoản/địa điểm yêu thích tạo thêm trong lúc chạy sẽ mất theo. Có 2 hướng khắc phục:

- **Nâng cấp gói trả phí** (`starter` trở lên): mở `render.yaml`, đổi `plan: free` thành `plan: starter`, sau đó bỏ dấu `#` ở khối `disk` được để sẵn (dạng comment) ở cuối file rồi deploy lại — dữ liệu sẽ được lưu bền vững qua các lần deploy.
- **Dùng database ngoài** (khuyến nghị cho sản phẩm thật): thay `src/store.js` bằng kết nối PostgreSQL/MongoDB. Render có addon PostgreSQL miễn phí có thể khai báo thêm trong `render.yaml`.

**Đổi mật khẩu Admin sau khi deploy thật**: vì mật khẩu admin mặc định đã lộ trong tài liệu này, sau khi lên production bạn nên đăng nhập bằng tài khoản admin gốc rồi tự đổi mật khẩu cho các tài khoản khác — hoặc sửa `ADMIN_PASSWORD` trong `src/store.js` trước khi deploy lần đầu, trước khi `data/db.json` được sinh ra (sau khi đã sinh ra, sửa file này sẽ không có tác dụng nữa vì tài khoản admin đã tồn tại trong ổ đĩa).

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
