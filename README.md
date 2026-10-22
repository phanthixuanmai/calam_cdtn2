# Freelance Marketplace

## Mục tiêu
Dự án này là nền tảng quản lý freelance / marketplace việc làm part-time cho sinh viên, bao gồm:
- Sinh viên tìm việc, ứng tuyển và theo dõi tiến độ
- Nhà tuyển dụng đăng tin và duyệt ứng viên
- Admin quản trị hệ thống

> Lưu ý: Vì môi trường hiện có không có ổ đĩa D, dự án đã được tạo trong workspace có đường dẫn tương đương: `c:\Users\Admin\OneDrive - VLG\làm bài tập\chuyen_de_2\freelance-marketplace`.
> Nếu bạn muốn đặt đúng theo yêu cầu ban đầu, hãy di chuyển thư mục này sang `D:\freelance-marketplace` trên máy local của bạn.

## 1. Cài đặt Java
1. Tải JDK 23 hoặc JDK 17+.
2. Cài đặt và thêm biến môi trường `JAVA_HOME`.
3. Kiểm tra:
```bash
java -version
```

## 2. Cài đặt Node.js
1. Tải Node.js 18+.
2. Kiểm tra:
```bash
node -v
npm -v
```

## 3. Cấu hình MongoDB
File `server/.env` đã được tạo để bạn điền URI Atlas. Mở file bằng:
```powershell
cd server
notepad .env
```
Thay giá trị ví dụ của `MONGODB_URI` bằng URI Atlas của bạn và đặt tên database là `freelance_marketplace`. `server/.env` được Git bỏ qua để tránh đưa thông tin đăng nhập vào mã nguồn. Không chia sẻ nội dung file này. Nếu mật khẩu có ký tự đặc biệt, hãy URL-encode mật khẩu trong URI. Trong MongoDB Atlas, cho phép IP máy chạy backend trong Network Access.

Backend tự tạo database/collection khi cần; không cần chạy script SQL.

## 4. Cấu hình application.properties
File cấu hình backend nằm tại:
- `server/src/main/resources/application.properties`

Cấu hình mặc định dùng MongoDB local; đặt `MONGODB_URI` để kết nối Atlas. Trước khi triển khai, hãy thay JWT secret bằng biến môi trường/secret riêng; không dùng giá trị development trong production.
```properties
spring.data.mongodb.uri=${MONGODB_URI:mongodb://localhost:27017/freelance_marketplace}
jwt.secret=${JWT_SECRET:change-this-secret-key-for-production}
```

## 5. Chạy server
```bash
cd server
.\run.ps1
```
Script dùng Maven nếu đã cài; nếu chưa, script chạy JAR dựng sẵn trong `server/target`.

Backend chạy tại:
- http://localhost:8080

## 6. Chạy client-customer
```bash
cd client-customer
npm install
npm run dev
```
Client customer chạy tại:
- http://localhost:3000

## 7. Chạy client-admin
```bash
cd client-admin
npm install
npm run dev
```
Client admin chạy tại:
- http://localhost:3001

## 8. Tài khoản test
- Admin được seed tự động lần đầu: `admin@freelance.local` / `admin123`.
- Đăng ký tài khoản Student hoặc Employer tại client-customer; hệ thống không cho đăng ký role Admin.
- Đổi mật khẩu admin mặc định trước khi dùng môi trường chia sẻ.

## 9. API cơ bản
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/jobs`
- `POST /api/jobs`
- `GET /api/jobs/{id}`
- `POST /api/applications`
- `GET /api/applications/my`
- `GET /api/notifications`
- `GET /api/admin/users`

## 10. Kiến trúc dự án
```text
freelance-marketplace/
├── server/
├── client-customer/
├── client-admin/
├── database/
├── docs/
└── README.md
```

`database/database.sql` là schema MySQL cũ để tham khảo, không được backend MongoDB sử dụng. Backend là nơi xác thực JWT, phân quyền role và kiểm tra quyền sở hữu dữ liệu; frontend chỉ gọi REST API.
