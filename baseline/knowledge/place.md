# Module QUÁN (Mã: PLACE)

## Business Rules
[V1.0.0] Danh sách quán khởi đầu để trống, không seed dữ liệu mẫu — user tự thêm dần.
[V1.0.0] Cho phép lọc theo loại món và khoảng giá.
[V1.0.0] Cho phép đề xuất quán mới và đánh giá (rating) quán đã đi.

## Data
Place: id, tên, loại món, khoảng giá, địa chỉ, rating trung bình, người đề xuất

## Feature Dependency & Impact
| Feature | Phụ thuộc vào | Ảnh hưởng đến | Mức độ ảnh hưởng | Ghi chú |
|---|---|---|---|---|
| Đề xuất quán | User | Danh sách quán gợi ý khi tạo Event | Thấp | |
| Rating quán | User | Điểm rating trung bình hiển thị | Thấp | |
