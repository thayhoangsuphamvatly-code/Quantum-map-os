# Quantum Map OS 🛰️

Ứng dụng bản đồ kiểu Google Maps, giao diện **neon tối**, dùng **Leaflet** (OpenStreetMap) cho phần bản đồ, có **backend + frontend** đầy đủ, **3 hạng tài khoản** (Admin / Pro / Thường), và **cài đặt được như một ứng dụng thật (PWA)** trên cả điện thoại lẫn máy tính.

## Tính năng

- 🔍 **Tìm kiếm gợi ý tức thời**: gõ tới đâu gợi ý tới đó (Nominatim - OpenStreetMap), có icon theo loại địa điểm (nhà/đường/thành phố...), lưu **lịch sử tìm gần đây**, điều hướng bằng bàn phím (↑ ↓ Enter)
- 🏠 **Tìm số nhà mạnh hơn**: tự động thử nhiều chiến lược khi số nhà không có kết quả ngay (thêm ngữ cảnh quốc gia, tìm kiếm có cấu trúc, hỗ trợ định dạng hẻm/ngõ kiểu Việt Nam như "12A/3", dùng thêm nguồn dữ liệu dự phòng Photon), luôn báo rõ khi chỉ tìm được vị trí gần đúng theo tên đường
- 📍 Định vị vị trí hiện tại (GPS trình duyệt)
- 🧭 Tìm đường cho **4 phương tiện**: Ô tô, Xe máy (xấp xỉ theo hồ sơ ô tô), Xe đạp, Đi bộ
- 📇 **Thẻ chi tiết địa điểm** kiểu Google Maps: ảnh minh họa thật (Wikimedia Commons), thời tiết hiện tại, địa chỉ, và các nút **Đường đi / Lưu / Gần đó / Gửi tới điện thoại (QR) / Chia sẻ**
- 🏨 **Gợi ý địa điểm lân cận** theo danh mục (khách sạn, ăn uống, cà phê, xăng dầu, ATM, nhà thuốc...) — dữ liệu OpenStreetMap thật qua Overpass API
- ⭐ **Yêu thích có phân loại**: Nhà / Công ty / Ăn uống / Du lịch / Mua sắm / Khác, lọc nhanh bằng chip
- 🌦️ **Thời tiết thời gian thực** tại vị trí trung tâm bản đồ và tại từng địa điểm (Open-Meteo — miễn phí, không cần khóa API)
- ⛅ **Dự báo thời tiết tại cả điểm đi và điểm đến** khi tìm đường: nhiệt độ hiện tại, nhiệt độ cao/thấp trong ngày, và cảnh báo nếu có khả năng mưa trong vài giờ tới
- 🚦 Hiển thị **đèn giao thông** thật trên tuyến đường (dữ liệu OpenStreetMap)
- ⚠️ **Cảnh báo khu vực có thể đông đúc** theo khung giờ cao điểm — xem mục "Minh bạch dữ liệu" bên dưới
- ▶️ **Điều hướng trực tiếp**: bấm "Bắt đầu" để liên tục cập nhật vị trí của bạn trên bản đồ và khoảng cách còn lại theo thời gian thực
- ⬇️ **Tải Ứng Dụng**: cài Quantum Map OS như một ứng dụng thật (PWA) trên cả điện thoại và máy tính, có icon riêng, mở toàn màn hình không cần trình duyệt
- 🔐 Đăng nhập bằng JWT, **không có trang đăng ký** — chỉ Admin được tạo tài khoản
- 🛡️ Trang **Quản Lý Tài Khoản** (chỉ Admin thấy được): tạo/sửa/khóa/xóa tài khoản, đổi vai trò, đổi **hạng tài khoản**, và bật/tắt từng quyền tính năng
- 📱 Giao diện **responsive** thật sự: trên máy tính panel Tìm đường/Yêu thích/Chi tiết địa điểm **neo cạnh bản đồ** (không đè lên), trên điện thoại có thanh điều hướng dưới cùng + bottom-sheet giống app bản đồ di động
- 🎨 Giao diện neon tối: nền chòm sao chuyển động, viền phát sáng, gradient cyan/tím/hồng

## 3 hạng tài khoản (+ cờ Doanh nghiệp độc lập)

| Hạng | Quyền hạn |
|---|---|
| **ADMIN** | Toàn quyền: quản lý mọi tài khoản, tự động có đầy đủ tính năng PRO |
| **PRO** | Tìm đường **nhiều lựa chọn tuyến** (nhanh nhất/ngắn nhất), xem **các tuyến thay thế**, **cảnh báo khu vực có thể đông đúc / cảnh báo đỏ**, xem đèn giao thông & cảnh báo trên tuyến |
| **STANDARD (Thường)** | Tìm đường cơ bản — một tuyến duy nhất, giống bản Google Maps thông thường, không có các cảnh báo nâng cao |

Cả 3 hạng đều có thể bị Admin **giới hạn thêm** từng tính năng riêng lẻ (tìm kiếm / tìm đường / định vị / yêu thích) độc lập với hạng tài khoản.

**Tài khoản Doanh nghiệp** là một **cờ (flag) độc lập** (`isBusiness`) mà Admin có thể bật cho bất kỳ tài khoản STANDARD hay PRO nào — không phải hạng thứ 4. Tài khoản có cờ này được vào mục **"Quảng Cáo Của Tôi"** để gắn **một địa điểm quảng cáo** (tên, danh mục, mô tả, số điện thoại, vị trí trên bản đồ). Địa điểm này:

- Hiển thị **công khai trên bản đồ cho mọi người dùng** với marker vàng riêng biệt (🏷️)
- **Luôn có nhãn "🏷️ QUẢNG CÁO"** rõ ràng ở mọi nơi nó xuất hiện (trên bản đồ, trong thẻ chi tiết địa điểm, trong mục "Được quảng cáo gần đây") — **không bao giờ trộn lẫn** với kết quả tìm kiếm/gợi ý tự nhiên, để đảm bảo minh bạch với người dùng
- Admin có trang **kiểm duyệt quảng cáo** riêng (trong Quản Lý Tài Khoản) để gỡ bỏ bất kỳ địa điểm quảng cáo nào vi phạm
- Giới hạn 1 địa điểm/tài khoản doanh nghiệp trong phiên bản này (có thể mở rộng sau trong `src/store.js`, hằng số `MAX_LISTINGS_PER_BUSINESS`)

## Giới thiệu khu vực

Khi mở chi tiết một địa điểm, ứng dụng tự động hiển thị mục **"Giới thiệu khu vực"** gồm:

- Đoạn tóm tắt **thật từ Wikipedia tiếng Việt** (nếu địa danh có bài viết tương ứng — ví dụ tên tỉnh/thành, phường/xã, địa danh nổi tiếng), kèm liên kết "Theo Wikipedia →" dẫn tới bài viết gốc
- Thống kê **tiện ích thật xung quanh** trong bán kính 1.5km, lấy từ dữ liệu OpenStreetMap (Overpass API): số trường học, cơ sở y tế, quán ăn, chợ/siêu thị, ngân hàng/ATM, nhà thuốc, công viên — không bịa số liệu, chỉ đếm những gì cộng đồng OSM đã gắn thẻ

## ⚠️ Minh bạch dữ liệu (quan trọng, xin đọc kỹ)

Ứng dụng này dùng **100% dịch vụ bản đồ miễn phí, không cần khóa API trả phí**. Điều đó có nghĩa một số tính năng là **ước tính hoặc xấp xỉ** thay vì dữ liệu cảm biến thời gian thực thật — đội ngũ phát triển cam kết không bịa số liệu:

- **"Khu vực có thể đông đúc" / cảnh báo đỏ (PRO)**: đây là **ước tính** kết hợp 3 yếu tố miễn phí có sẵn — khung giờ cao điểm (7–9h, 17–19h ngày thường), ngày trong tuần (cuối tuần thường đỡ tắc hơn), và **mật độ giao lộ trên tuyến** (số khúc rẽ/giao lộ mỗi km — đường nội thành nhiều giao lộ thường dễ tắc hơn đường thẳng một mạch). Đây **không phải dữ liệu cảm biến giao thông thời gian thực**. Muốn có dữ liệu tắc đường thời gian thực chính xác thật (như Google Maps dùng dữ liệu vị trí ẩn danh từ hàng triệu điện thoại), bắt buộc phải tích hợp API trả phí (Google Maps Platform, TomTom Traffic, HERE Traffic...) — đây là giới hạn kỹ thuật thực sự của mọi giải pháp miễn phí, không riêng gì ứng dụng này.
- **Tuyến đường xe máy**: chưa có máy chủ chỉ đường miễn phí công khai dành riêng cho xe máy, nên hệ thống **xấp xỉ bằng hồ sơ định tuyến ô tô** — ứng dụng luôn hiển thị rõ lưu ý này trong giao diện.
- **Đèn giao thông & cảnh báo công trình**: là dữ liệu **thật** từ cộng đồng OpenStreetMap (Overpass API), nhưng có thể **không đầy đủ 100%** tùy khu vực đã được người dùng OSM cập nhật hay chưa.
- **Ảnh địa điểm**: lấy thật từ Wikimedia Commons theo tên địa điểm — chỉ hiển thị khi tìm thấy ảnh phù hợp; không phải mọi địa chỉ đều có ảnh (khác với Google Street View, vốn cần hợp đồng trả phí).
- **Giá khách sạn/giá phòng**: ứng dụng **không hiển thị giá** trong mục "Gần đó" vì việc lấy giá thật theo thời gian thực yêu cầu hợp tác trả phí với các nền tảng đặt phòng (Booking.com, Google Hotels...) — hiển thị giá bịa sẽ gây hiểu lầm cho người dùng nên chúng tôi không làm vậy.
- **Điều hướng trực tiếp**: vị trí của bạn được cập nhật liên tục qua GPS trình duyệt; tuyến đường được **làm mới định kỳ mỗi ~25 giây** (không phải mỗi giây) để tránh làm quá tải máy chủ định tuyến miễn phí công cộng.

## Nút "Tải Ứng Dụng"

Đây là tính năng **Progressive Web App (PWA) thật**, không phải liên kết giả tới cửa hàng ứng dụng:

- **Trên máy tính** (Chrome/Edge): bấm nút sẽ hiện hộp thoại cài đặt của trình duyệt, sau khi cài app sẽ có icon riêng và mở như phần mềm độc lập.
- **Trên Android** (Chrome): tương tự, cài thẳng vào màn hình chính.
- **Trên iPhone/iPad** (Safari): iOS không cho phép hộp thoại cài tự động, ứng dụng sẽ hướng dẫn bạn bấm nút Chia sẻ → "Thêm vào Màn hình chính".

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
cd quantum-map-os

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

Tạo một repo (GitHub/GitLab) và đẩy **toàn bộ nội dung thư mục `quantum-map-os`** (bao gồm `server.js`, `package.json`, `src/`, `public/`, `render.yaml`) lên làm gốc repo đó. Không cần đẩy `node_modules/` hay `data/db.json` (đã có trong `.gitignore`).

```bash
cd quantum-map-os
git init
git add .
git commit -m "Quantum Map OS"
git branch -M main
git remote add origin <URL_repo_cua_ban>
git push -u origin main
```

**Bước 2 — Tạo Blueprint trên Render**

1. Đăng nhập [render.com](https://render.com) → **New** → **Blueprint**.
2. Chọn repo vừa đẩy lên. Render sẽ tự phát hiện `render.yaml`.
3. Bấm **Apply** — Render tự động: cài `npm install`, chạy `npm start`, tạo ổ đĩa lưu trữ bền vững (`disk`) cho thư mục `data/` để **dữ liệu tài khoản/yêu thích không bị mất mỗi lần deploy lại**, và tự sinh `JWT_SECRET` ngẫu nhiên an toàn.
4. Chờ build xong, mở đường dẫn dạng `https://quantum-map-os.onrender.com`.

**Nếu để trong monorepo** (thư mục `quantum-map-os` nằm trong một repo lớn hơn): vào phần cấu hình service trên Render → **Settings → Root Directory** → nhập `quantum-map-os`.

**Lưu ý gói Free**: service sẽ tự "ngủ" sau khoảng 15 phút không có ai truy cập, và mất khoảng 30–60 giây để "thức dậy" ở lượt truy cập kế tiếp. Đây là giới hạn của gói miễn phí Render, không phải lỗi ứng dụng.

**⚠️ Về việc lưu trữ dữ liệu trên gói Free**: Render **không hỗ trợ ổ đĩa bền vững (persistent disk) cho gói Free**, nên file `data/db.json` sẽ bị tạo lại (chỉ còn tài khoản Admin mặc định) mỗi khi service khởi động lại hoặc deploy lại — mọi tài khoản/địa điểm yêu thích tạo thêm trong lúc chạy sẽ mất theo. Có 2 hướng khắc phục:

- **Nâng cấp gói trả phí** (`starter` trở lên): mở `render.yaml`, đổi `plan: free` thành `plan: starter`, sau đó bỏ dấu `#` ở khối `disk` được để sẵn (dạng comment) ở cuối file rồi deploy lại — dữ liệu sẽ được lưu bền vững qua các lần deploy.
- **Dùng database ngoài** (khuyến nghị cho sản phẩm thật): thay `src/store.js` bằng kết nối PostgreSQL/MongoDB. Render có addon PostgreSQL miễn phí có thể khai báo thêm trong `render.yaml`.

**Đổi mật khẩu Admin sau khi deploy thật**: vì mật khẩu admin mặc định đã lộ trong tài liệu này, sau khi lên production bạn nên đăng nhập bằng tài khoản admin gốc rồi tự đổi mật khẩu cho các tài khoản khác — hoặc sửa `ADMIN_PASSWORD` trong `src/store.js` trước khi deploy lần đầu, trước khi `data/db.json` được sinh ra (sau khi đã sinh ra, sửa file này sẽ không có tác dụng nữa vì tài khoản admin đã tồn tại trong ổ đĩa).

## Cấu trúc thư mục

```
quantum-map-os/
  server.js              # Điểm khởi động Express
  src/
    store.js              # "Database" JSON: users (role+tier+permissions), favorites (có category)
    auth.js                # Ký & xác minh JWT
    middleware.js           # Xác thực đăng nhập, kiểm tra quyền Admin/permission/PRO
    routes/
      auth.js               # POST /api/auth/login, GET /api/auth/me
      admin.js              # CRUD tài khoản + hạng tài khoản (chỉ Admin)
      favorites.js          # CRUD địa điểm yêu thích có phân loại (theo từng user)
      geo.js                # Proxy: tìm kiếm, tìm đường (nhiều phương tiện),
                             # thời tiết, ảnh, địa điểm lân cận, đèn giao thông
  public/                  # Frontend tĩnh (HTML/CSS/JS thuần, không cần build)
    login.html
    index.html
    manifest.json           # Khai báo PWA (tên, icon, màu nền...)
    sw.js                   # Service worker (bắt buộc để "Tải Ứng Dụng" hoạt động)
    icons/                  # Icon PWA (192px, 512px, apple-touch-icon)
    css/style.css
    js/{pwa,bg-canvas,api,login,app,map,admin}.js
  data/db.json             # Tự sinh khi chạy lần đầu
```

## Ghi chú kỹ thuật & bảo mật khi triển khai thật

- Mật khẩu được băm bằng `bcryptjs`, không lưu dạng thô.
- Đổi `JWT_SECRET` bằng biến môi trường khi đưa lên production (mặc định trong `src/auth.js` chỉ dùng để chạy thử).
- Dữ liệu lưu ở file JSON để dễ chạy ở bất kỳ máy nào không cần cài database ngoài. Nếu triển khai quy mô lớn, có thể thay `src/store.js` bằng PostgreSQL/MongoDB mà không cần đổi các route phía trên (giữ nguyên các hàm export).
- Tìm kiếm & tìm đường dùng dịch vụ **miễn phí** của OpenStreetMap (Nominatim, OSRM demo server, routing.openstreetmap.de) — phù hợp để học tập/demo. Nếu dùng cho sản phẩm thật với lượng truy cập lớn, nên đăng ký dịch vụ geocoding/routing trả phí (Mapbox, Google, GraphHopper...) để đảm bảo giới hạn tần suất.
- Thời tiết dùng **Open-Meteo** (miễn phí, không cần khóa API, giới hạn hợp lý cho ứng dụng vừa/nhỏ).
- Địa điểm lân cận + đèn giao thông dùng **Overpass API** (`overpass-api.de`) — là dịch vụ cộng đồng miễn phí, có giới hạn tần suất công bằng (fair-use); nếu lưu lượng truy cập lớn, nên tự host Overpass instance riêng hoặc dùng dịch vụ trả phí.
- Ảnh địa điểm dùng **Wikimedia Commons API** (miễn phí, không cần khóa API).
- Tất cả các dịch vụ bên ngoài trên đều được gọi qua backend (không gọi thẳng từ trình duyệt), vừa để giấu chi tiết hạ tầng vừa để có thể kiểm soát quyền truy cập theo từng tài khoản.
- CORS đang mở cho mọi nguồn (`cors()`), nên giới hạn origin cụ thể khi triển khai thật.
