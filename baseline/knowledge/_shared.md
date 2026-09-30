# Shared Knowledge — NomNom

## Nguyên tắc chung
[V1.0.0] Không phân quyền — mọi user đều có quyền tạo lời rủ, đề xuất quán, tham gia, nhập chi phí như nhau.
[V1.0.0] Ứng dụng chạy local (mở file HTML / live-server trên máy), dữ liệu runtime lưu qua localStorage của trình duyệt, file JSON trong `data/` là dữ liệu mẫu/seed ban đầu.
[V1.0.0] Giao diện ưu tiên thân thiện, dùng tốt trên điện thoại (mobile-friendly).
[V1.0.0] Tech stack: HTML/CSS/JS thuần, không framework, không build tool.

## Module Dependency & Impact
| Module | Phụ thuộc vào | Ảnh hưởng đến | Mức độ ảnh hưởng | Ghi chú |
|---|---|---|---|---|
| EVENT | PLACE (chọn địa điểm, optional), USER (người tạo/tham gia) | - | Trung bình | Event có thể không cần Place |
| PLACE | - | EVENT (gợi ý địa điểm khi tạo lời rủ) | Thấp | Độc lập, phát triển riêng được |
| USER | - | EVENT, PLACE (gắn người tạo/tham gia/đề xuất/rating) | Cao | Mọi module đều tham chiếu User |
