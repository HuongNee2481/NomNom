# Module RỦ (Mã: EVENT)

## Business Rules
[V1.0.0] Loại hoạt động không giới hạn cố định: ăn trưa / ăn tối / trà sữa / cà phê / khác (tự nhập).
[V1.0.0] Địa điểm là trường optional, có thể để trống, bổ sung sau.
[V1.0.0] Người dùng phải bấm nút "Tham gia" để được tính là đi ăn — click vào link order chung không tự động tính là tham gia.
[V1.0.0] Khi số người tham gia đạt giới hạn (nếu có đặt giới hạn) → lời rủ tự động ẩn khỏi danh sách lời rủ đang mở.
[V1.0.0] Lời rủ có thể đính kèm link order chung (optional, ví dụ link đặt đơn nhóm GrabFood/ShopeeFood).
[V1.0.0] Sau khi order xong, người tạo lời rủ nhập bảng chi tiết chi phí theo từng người tham gia (món ăn, giá tiền) — nhập tay, chưa có OCR đọc hóa đơn tự động ở bản này. App tự tính tổng tiền cả nhóm và tiền từng người phải trả.

## Data
Event: id, loại, thời gian, địa điểm (optional), giới hạn số người (optional), link order (optional), ghi chú, người tạo, danh sách người tham gia, trạng thái (mở/đủ người/đã xong), billItems[] (người, món, giá tiền)

## Feature Dependency & Impact
| Feature | Phụ thuộc vào | Ảnh hưởng đến | Mức độ ảnh hưởng | Ghi chú |
|---|---|---|---|---|
| Tạo lời rủ | User (người tạo), Place (optional) | Danh sách lời rủ đang mở | Cao | |
| Tham gia lời rủ | User | Trạng thái Event (ẩn khi đủ người) | Cao | |
| Tổng hợp chi phí | Danh sách người tham gia | - | Trung bình | Nhập tay sau khi order, chưa OCR |
