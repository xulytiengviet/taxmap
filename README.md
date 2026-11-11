# TaxMap Việt Nam

Trang tra cứu thông tin mã số thuế và **hướng dẫn kiểm tra thông báo tạm hoãn xuất cảnh** qua cổng chính thức của Cục Thuế.

- **Website tĩnh:** `index.html`, `assets/style.css`, `assets/app.js`
- **Nguồn doanh nghiệp:** Xinvoice `GET https://api.xinvoice.vn/gdt-api/tax-payer/:taxCode`
- **Backend an toàn:** Cloudflare Worker trong `worker/`
- **Thông báo xuất cảnh:** liên kết sang [đã có thông báo](https://gdt.gov.vn/wps/portal/Home/nt/xc) và [sẽ tạm hoãn](https://gdt.gov.vn/wps/portal/Home/nt/se) để người dùng tự nhập mã xác nhận tại Cục Thuế.

> **Giới hạn quan trọng:** Xinvoice **không** cung cấp thông tin tạm hoãn xuất cảnh. TaxMap chưa có API chính thức để tự động trả về thông báo từ CCCD hoặc MST. Chức năng thông báo chỉ là hỗ trợ mở đúng biểu mẫu và sao chép mã người dùng nhập. Không có dữ liệu xuất cảnh = **chưa xác minh**, không phải “được phép xuất cảnh”. Trạng thái MST không phải trạng thái xuất cảnh.

## Cấu trúc

```text
taxmap/
├── index.html
├── assets/
│   ├── style.css
│   ├── app.js
│   └── config.js         # URL public của Worker, KHÔNG có secret
├── worker/
│   ├── src/index.js      # proxy bảo vệ khóa Xinvoice
│   ├── test/index.test.mjs
│   ├── package.json
│   └── wrangler.toml
├── .github/workflows/ci.yml
└── README.md
```

## 1. Chạy giao diện

Mở `index.html` với local HTTP server, ví dụ:

```sh
python -m http.server 8080
```

Mở `http://localhost:8080`. Chọn **Xem dữ liệu mẫu** để kiểm tra giao diện. Đó là dữ liệu ví dụ từ tài liệu Xinvoice, **không phải kết quả thực tế**.

Để xuất bản trang: GitHub → **Settings → Pages → Deploy from a branch** → `main` / `/(root)` → Save. Đường dẫn dự kiến sau khi Pages được bật là `https://xulytiengviet.github.io/taxmap/`; không mặc định coi URL này đã được triển khai.

## 2. Đăng ký API Xinvoice

Xem [tài liệu tích hợp](https://xinvoice.vn/docs/api-tich-hop/api-tra-mst/). Nhà cung cấp yêu cầu `client-id` và `api-key`.

**Không bao giờ** ghi các khóa này vào repository, `assets/config.js`, JavaScript ở trình duyệt, GitHub Actions logs, hay URL query string.

## 3. Triển khai backend trên Cloudflare Workers

Yêu cầu: Node.js (khuyến nghị 22+), tài khoản Cloudflare, Wrangler CLI, cặp khóa Xinvoice hợp lệ.

```sh
cd worker
npm install
npx wrangler login
npx wrangler secret put XINVOICE_CLIENT_ID
npx wrangler secret put XINVOICE_API_KEY
npx wrangler deploy
```

Wrangler dùng `worker/wrangler.toml`, đã giới hạn Origin về `https://xulytiengviet.github.io` và có rate-limit xấp xỉ 10 request/phút/IP/điểm Cloudflare. Đây **không** phải giới hạn toàn cầu tuyệt đối, Origin/CORS **không phải xác thực chống bot**. Đối với website đông người dùng, bổ sung Turnstile, Cloudflare WAF, giới hạn quota và theo dõi mức sử dụng khóa Xinvoice trước khi mở rộng.

Worker cung cấp:

- `GET /health` — thông tin dịch vụ, không kiểm tra trạng thái xuất cảnh.
- `POST /api/lookup` — JSON `{"taxCode":"0101248141"}`, chỉ chấp nhận MST 10 hoặc 13 số, trả về các trường đã chọn lọc của Xinvoice.
- Không có endpoint `/exit-check` bởi chưa có API nhà nước được cấp quyền.

Nếu mở trang bằng `localhost` khi phát triển thì cần đổi `ALLOWED_ORIGIN` sang origin tương ứng, triển khai worker, sau đó **đổi lại** origin GitHub Pages cho production.

## 4. Nối website với backend

Trong `assets/config.js`, điền hostname Worker của chính bạn:

```js
window.TAXMAP_CONFIG = Object.freeze({
  apiBase: 'https://taxmap-api.TAI_KHOAN.workers.dev'
});
```

Chỉ URL public; **không đưa API key vào file**. Khi chưa cấu hình, giao diện không giả vờ đã tra cứu thành công và sẽ báo cần thiết lập backend.

## 5. Tra cứu thông báo xuất cảnh

Chọn tab **Thông báo xuất cảnh**, nhập số định danh / CMND / MST, chọn **Chuẩn bị tra cứu**. Sau đó sao chép số vào biểu mẫu tại một trong hai cổng:

- [Cục Thuế — thông báo về xuất cảnh](https://gdt.gov.vn/wps/portal/Home/nt/xc): tạm hoãn, gia hạn, hủy bỏ.
- [Cục Thuế — thông báo sẽ tạm hoãn](https://gdt.gov.vn/wps/portal/Home/nt/se): thông báo trước khi áp dụng.

Điền mã xác nhận do **Cục Thuế** hiển thị; không có tự động hóa CAPTCHA, không scraping không được phép. Số được xử lý trong phiên trình duyệt, không lưu vào localStorage/cookie, không gửi vào API Xinvoice.

Người vừa đổi CCCD nên tự kiểm tra cả CMND cũ nếu cần; dữ liệu liên thông lịch sử hiện chưa tích hợp.

## 6. Kiểm thử

```sh
cd worker
npm test
```

Và:

```sh
node --check assets/app.js
node --check worker/src/index.js
```

Tests sử dụng mock, không thực hiện truy vấn trả phí hay tra cứu dữ liệu cá nhân thật.

## Ranh giới sử dụng và quyền riêng tư

- Không công bố dữ liệu cá nhân tra cứu hàng loạt, không lưu CCCD lên server hoặc GitHub.
- Mã số thuế doanh nghiệp được gửi tới backend qua HTTPS sau khi người dùng chủ động tra cứu; Worker gọi Xinvoice bằng khóa server-side.
- Dữ liệu doanh nghiệp có thời điểm cập nhật riêng, không nhất thiết thời gian thực.
- TaxMap là dự án hỗ trợ tra cứu, **không phải cổng nhà nước**, không cấp giấy xác nhận đủ điều kiện xuất cảnh.
- Khi cần kết luận chính thức, đối chiếu trực tiếp thông báo với Cục Thuế và cơ quan quản lý xuất nhập cảnh.

**Nguồn tham khảo:** [Xinvoice API](https://xinvoice.vn/apis/tra-cuu-ma-so-thue/) · [Cổng Cục Thuế](https://gdt.gov.vn/) · [Tra cứu MST](https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp).
