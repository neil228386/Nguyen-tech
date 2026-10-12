# Nguyen Tech

Website bán đồ công nghệ bằng tiếng Việt, dùng React + Vite cho giao diện và Express + SQLite cho API. Yêu cầu **Node.js 24 trở lên**.

## Chạy để phát triển

```bash
cd /workspace/Nguyen-tech
npm ci --cache /tmp/nguyen-tech-npm-cache --no-audit --no-fund
npm run dev
```

Vite chạy cổng `5173`, API chạy cổng `3001`. Vite chuyển tiếp `/api` tới backend. Phông chữ và ảnh được lưu cục bộ, không cần dịch vụ ảnh hoặc khóa API để chạy.

## Chức năng

- Trang chủ với 6 danh mục và 16 sản phẩm mẫu; tìm kiếm có dấu/không dấu, lọc thương hiệu/giá, sắp xếp.
- Chi tiết sản phẩm, thông số, màu sắc, sản phẩm liên quan, danh sách yêu thích.
- Giỏ hàng lưu trên trình duyệt và đồng bộ với giá/tồn kho mới nhất khi tải dữ liệu.
- Đặt hàng khách vãng lai hoặc thành viên; thanh toán khi nhận hàng (COD); mã `HELLO10` giảm 10%, tối đa 500.000đ.
- Phí vận chuyển mẫu: miễn phí khi tạm tính sản phẩm trước giảm giá từ 2.000.000đ; nếu thấp hơn là 30.000đ.
- Đăng ký/đăng nhập/đăng xuất, cookie HttpOnly, mật khẩu băm bằng scrypt.
- Lịch sử đơn của thành viên; tra cứu bằng mã đơn và email tương ứng.
- Quản trị giá/tồn kho và trạng thái đơn: chờ xác nhận → xác nhận → đang giao → hoàn tất. Hủy đơn chờ xác nhận/đã xác nhận sẽ hoàn lại tồn kho đúng một lần.
- Server tự tính giá và giảm tồn kho trong giao dịch SQLite; nếu tổng tiền thay đổi sau khi khách xem, yêu cầu kiểm tra lại trước khi đặt.

## Cấp quyền quản trị

1. Tạo tài khoản thông thường tại trang `/tai-khoan`.
2. Tại máy chạy ứng dụng, cấp quyền cho **email của bạn đã đăng ký**:

```bash
npm run admin -- email-cua-ban@example.com
```

3. Tải lại trang và mở `/quan-tri`, hoặc dùng nút quản trị trong trang tài khoản.

Không có tài khoản hay mật khẩu quản trị mặc định. Chỉ người có quyền chạy lệnh trên máy chủ mới có thể cấp quyền.

## Build và chạy bản build

```bash
npm run build
npm start
```

Backend phục vụ cả `dist/` và API trên cổng `3001`, bao gồm truy cập trực tiếp các đường dẫn trang. Khi triển khai qua HTTPS, dùng `NODE_ENV=production` để cookie đăng nhập có thuộc tính Secure. Frontend và API được phục vụ cùng origin; `FRONTEND_ORIGIN` là danh sách origin tin cậy phân cách bằng dấu phẩy khi reverse proxy cần cấu hình rõ, không bật CORS khác origin.

Biến tùy chọn: `PORT` (mặc định `3001`), `DATABASE_PATH` (mặc định `server/data/shop.sqlite`). Nếu đổi cổng API lúc phát triển, cần cập nhật đích proxy trong `vite.config.js`.

## Dữ liệu và sao lưu

SQLite lưu ở `server/data/shop.sqlite`, được bỏ qua bởi Git. Tài khoản, đơn, phiên đăng nhập, giá quản trị và tồn kho tồn tại sau khi khởi động lại. Seed cập nhật mô tả/ảnh sản phẩm mà không reset tồn kho hoặc giá quản trị. Không xóa thư mục `server/data` nếu muốn giữ dữ liệu. Sao lưu SQLite bằng API backup/SQLite CLI hoặc dừng dịch vụ rồi sao chép cả thư mục để tránh bỏ sót dữ liệu WAL. Các tiến trình phải được khởi động lại sau khi khôi phục snapshot môi trường.

## Kiểm thử

```bash
npm test
npm run build
```

13 kiểm thử HTTP integration xác minh catalogue, đăng nhập/đăng xuất, bảo vệ dữ liệu đơn, phí/coupon, giao dịch tồn kho, từ chối tổng tiền cũ, quyền quản trị, trạng thái đơn và dữ liệu sau khởi động lại. Mỗi kiểm thử sử dụng cơ sở dữ liệu riêng.

Kiểm thử trình duyệt tùy chọn dùng Python Playwright và Chromium. Trong môi trường cloud hiện tại, Playwright và `/usr/bin/chromium` đã có; chạy `npm run test:browser` sau build. Ngoài môi trường cloud, cài Python Playwright và cung cấp đường dẫn Chromium qua biến `CHROMIUM_PATH`.

Suite dùng cổng `3107` và SQLite tạm, không tạo tài khoản hoặc đơn trong database cửa hàng. Kiểm thử tìm kiếm/lọc, yêu thích, thông số, giỏ hàng sau reload và giá cũ, đặt hàng/coupon, tra cứu riêng tư, đăng ký/đăng xuất/đăng nhập, phân quyền, cập nhật quản trị và bố cục điện thoại.

## Trước khi mở bán thật

Đây là bản phát triển, **chưa được triển khai công khai**. Đặt hàng tạo dữ liệu thực trong ứng dụng nhưng chưa thu tiền, gửi email hay gọi đơn vị vận chuyển. Điểm đánh giá, giá, tồn kho và thông số là dữ liệu mẫu; ảnh minh họa có thể khác đời sản phẩm. Nguồn và giấy phép tìm được được ghi tại [public/images/ASSET_SOURCES.md](public/images/ASSET_SOURCES.md); dùng ảnh đúng SKU có quyền sử dụng trước khi kinh doanh.

Cần bổ sung sản phẩm/giá thực, tên miền/hosting HTTPS, thông tin liên hệ và chính sách cửa hàng, và tích hợp thanh toán/vận chuyển/email nếu cần. Trang quản trị hiện hỗ trợ giá và tồn kho của catalogue có sẵn; chưa có tạo/xóa sản phẩm, hoàn tiền hay đổi mật khẩu qua email.
