# TaxMap Việt Nam

Website hỗ trợ **tra cứu doanh nghiệp theo MST** và **tra cứu thông báo liên quan đến tạm hoãn xuất cảnh** trên cổng Cục Thuế.

- Giao diện: [index.html](index.html) + CSS + JavaScript thuần; có thể chạy trên **GitHub Pages**, không cần máy chủ riêng.
- **Mặc định:** thử `GET https://api.xinvoice.vn/gdt-api/tax-payer/{taxCode}` trực tiếp từ trình duyệt, **không gửi header khóa API**.
- Nếu Xinvoice không trả về dữ liệu, tự động thử `GET https://api.vietqr.io/v2/business/{taxCode}` (API công khai không cần khóa).
- Nguồn VietQR chỉ cho biết **nhận dạng doanh nghiệp** (MST, tên, địa chỉ), **không có trạng thái hoạt động / thông báo xuất cảnh**.
- Tab CCCD/CMND/MST dẫn sang trang [thông báo tạm hoãn](https://gdt.gov.vn/wps/portal/Home/nt/xc) và [thông báo sẽ tạm hoãn](https://gdt.gov.vn/wps/portal/Home/nt/se), tự nhập CAPTCHA tại Cục Thuế.

> **Quan trọng (11/11/2026):** Xinvoice công khai *đường dẫn* API nhưng [tài liệu chính thức](https://xinvoice.vn/docs/api-tich-hop/api-tra-mst/) vẫn yêu cầu header `client-id` và `api-key`. Do vậy **không có bảo đảm** Xinvoice sẽ trả lời một yêu cầu không kèm khóa hoặc cho phép CORS từ website GitHub Pages. TaxMap sẽ thử trực tiếp rồi fallback, không hiển thị dữ liệu mẫu như dữ liệu thật.

> **VietQR có kế hoạch ngừng hỗ trợ endpoint tra cứu MST từ 01/03/2027**; xem [thông báo của nhà cung cấp](https://www.vietqr.io/tra-cuu-mst). Đây là giải pháp dự phòng tạm thời, không nên coi là nguồn dữ liệu dài hạn.

## Cấu trúc

```text
taxmap/
├── index.html
├── assets/
│   ├── style.css
│   ├── app.js                 # giao diện, tabs, hồ sơ đầy đủ
│   ├── lookup.js              # Xinvoice trực tiếp → VietQR dự phòng
│   ├── map.js                 # Google Maps link + iframe
│   └── curated.js             # hồ sơ tham khảo có ngày và URL nguồn
├── worker/                    # mã nguồn proxy Xinvoice tùy chọn cho giai đoạn API có khóa
│   ├── src/index.js
│   ├── test/*.test.mjs        # tests tích hợp giả lập, không gửi MST thật
│   ├── package.json
│   └── wrangler.toml
├── .github/workflows/
│   ├── ci.yml
│   └── pages.yml
└── README.md
```

## Chạy ngay (không cấu hình API key, không cần Cloudflare)

1. GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Repository cần được bật Pages một lần.
2. Mở **Actions → Deploy TaxMap Pages → Run workflow**.
3. Sau khi workflow thành công, mở `https://xulytiengviet.github.io/taxmap/`.
4. Nhập MST 10 hoặc 13 số và bấm **Tra cứu MST**. Trang sẽ thử Xinvoice trước, sau đó VietQR khi cần. Dòng thông báo sẽ giải thích lỗi CORS/401/403/429 nếu có.
5. Nếu cần đối chiếu thông báo xuất cảnh, mở tab **Thông báo xuất cảnh**, nhập CCCD/CMND/MST và tiếp tục tại Cục Thuế.

Để thử ở máy cá nhân:

```sh
python -m http.server 8080
```

Mở `http://localhost:8080`. Nút **Xem dữ liệu mẫu** chỉ dùng để kiểm tra giao diện; nhãn mẫu được hiển thị rõ ràng.

## Hồ sơ doanh nghiệp mở rộng và bản đồ (11/11/2026)

Sau khi tra cứu thành công, màn hình chia **hồ sơ doanh nghiệp bên trái** và **Google Maps bên phải**. Có các trường: tên, MST, địa chỉ thuế, địa chỉ đăng ký, tình trạng MST, tên quốc tế, tên viết tắt, người đại diện, cơ quan thuế, loại hình, ngành nghề chính (mã ngành và mô tả) và thời gian cập nhật. Bên phải có bản đồ Google Maps theo chuỗi địa chỉ và nút **Mở trên Google Maps**.

- `assets/map.js` dùng địa chỉ đăng ký để tạo link `https://www.google.com/maps/search/?api=1&query=...` và nhúng iframe `https://maps.google.com/maps?q=...&output=embed`. Google tự tìm vị trí từ chuỗi địa chỉ, **không phải tọa độ địa chính đã kiểm chứng**. Nếu Google không nhúng được iframe, người dùng vẫn có nút mở trực tiếp. Việc nhúng bản đồ có thể chuyển địa chỉ doanh nghiệp công khai cho Google.
- Xinvoice theo tài liệu chính thức có 7 trường chủ yếu: `orgType`, `taxID`, `name`, `address`, `taxDepartment`, `status`, `updatedAt`. Không khẳng định API này cung cấp người đại diện hay ngành nghề chính. VietQR công bố thêm `internationalName` và `shortName`; hai trường này được hiển thị nếu có.
- `assets/curated.js` lưu **hồ sơ tham khảo duy nhất** của MST `0319776703` (CÔNG TY TNHH SXTM KINH DOANH MỸ ANH), đối chiếu ngày 03/11/2026 qua [Xinvoice hồ sơ công khai](https://xinvoice.vn/mst/0319776703-cong-ty-tnhh-sxtm-kinh-doanh-my-anh) và [DoanhNghiep.Biz](https://www.doanhnghiep.biz/0319776703-cong-ty-tnhh-sxtm-kinh-doanh-my-anh), kết hợp thông tin do người yêu cầu cung cấp. Những trường API không có được bổ sung từ hồ sơ tham khảo và gắn nhãn nguồn/ngày.
- **Không ghi đè trạng thái hoạt động thời gian thực** bằng trạng thái lưu lịch sử. Khi chỉ có hồ sơ tham khảo, trang gắn nhãn `Chưa xác minh hiện tại` và chỉ hiển thị trạng thái đã công bố vào ngày tham khảo. Mọi MST khác thiếu trường nào sẽ hiển thị **Chưa có dữ liệu**, không suy đoán người đại diện, ngành nghề hay trạng thái.
- Nút **Xem dữ liệu mẫu** hiển thị ví dụ `0319776703` từ hồ sơ tham khảo, có ghi rõ không phải kết quả API thời gian thực. Địa chỉ bản đồ là dữ liệu doanh nghiệp công khai, không bao gồm CCCD.
- Để mở rộng tất cả doanh nghiệp cần thêm **API dữ liệu doanh nghiệp có quyền truy cập hợp lệ** trả về các trường người đại diện/ngành nghề, hoặc biên mục có nguồn và ngày cập nhật theo giấy phép cho phép.

## Quy tắc biểu diễn dữ liệu

- **Xinvoice trả dữ liệu hợp lệ:** các trường `taxID`, `name`, `address`, `orgType`, `taxDepartment`, `status`, `updatedAt` được hiển thị tùy theo nội dung phản hồi.
- **VietQR trả dữ liệu hợp lệ:** `data.id` → MST; `data.name` → tên; `data.address` → địa chỉ; `data.internationalName` → tên quốc tế; `data.shortName` → tên viết tắt. Trạng thái, loại hình, cơ quan thuế, thời điểm cập nhật = **Chưa có dữ liệu** (trừ khi được bổ sung bằng hồ sơ tham khảo có nguồn/ngày riêng).
- **Hai nguồn không truy cập được:** báo lỗi và hướng dẫn đối chiếu cổng thuế, không hiển thị kết quả giả.
- **Thông báo xuất cảnh:** chưa có API tra cứu công khai chính thức cho TaxMap. Không có kết quả API doanh nghiệp ≠ được phép xuất cảnh.
- Không tự động vượt CAPTCHA, không thu thập hoặc công khai dữ liệu cá nhân hàng loạt.
- CCCD không gửi tới Xinvoice/VietQR. Khi nhập MST, MST được gửi tới các nhà cung cấp dữ liệu bằng HTTPS; không lưu CCCD/MST vào localStorage/cookie.

## Kiểm thử

```sh
node --check assets/app.js
node --check assets/lookup.js
node --check assets/curated.js
node --check assets/map.js
cd worker
npm test
```

Kiểm thử frontend bằng mock bao gồm: Xinvoice trả dữ liệu; Xinvoice báo 403; trình duyệt chặn CORS; VietQR thành công nhưng **không có trạng thái**; cả hai nguồn bị lỗi. Không có test nào gửi request đến API ngoài.

## Khi cần tra cứu trạng thái Xinvoice ổn định

Nếu Xinvoice thực thi xác thực theo tài liệu, tích hợp công khai không khóa không thể tự bảo đảm. Thư mục `worker/` được giữ **chỉ như một giải pháp tùy chọn trong tương lai** cho tổ chức đã được Xinvoice cấp API key. Frontend mặc định hiện không dùng Worker; không cần triển khai hay cấu hình Cloudflare để chạy chế độ công khai.

## Tài liệu

- [Xinvoice: API MST chính thức](https://xinvoice.vn/docs/api-tich-hop/api-tra-mst/)
- [VietQR: API tra cứu MST công khai](https://www.vietqr.io/tra-cuu-mst)
- [Cục Thuế: tra cứu đăng ký MST](https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp)
- [Cục Thuế: thông báo về xuất cảnh](https://gdt.gov.vn/wps/portal/Home/nt/xc)
