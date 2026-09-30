# Module USER (Mã: USER)

## Business Rules
[V1.0.0] Đăng nhập đơn giản bằng tên/email nội bộ, chưa cần hệ thống auth phức tạp.
[V1.0.0] Không phân quyền — mọi user có quyền thao tác như nhau.
[V1.0.0] Trang cá nhân hiển thị lịch sử event đã tham gia và danh sách quán yêu thích.

## Data
User: id, tên, email, lịch sử event đã tham gia, quán yêu thích

## Feature Dependency & Impact
| Feature | Phụ thuộc vào | Ảnh hưởng đến | Mức độ ảnh hưởng | Ghi chú |
|---|---|---|---|---|
| Đăng nhập | - | Tất cả module khác (định danh người dùng) | Cao | |
| Trang cá nhân | Event, Place | - | Trung bình | |
