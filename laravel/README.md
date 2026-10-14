# Hướng dẫn Khởi chạy Dự án Laravel 11 — EShopper Fashion Shop

Dự án này là Đồ án môn học Lập trình Web được thiết kế theo đúng kiến trúc chuẩn của **Laravel 11** kết hợp cơ sở dữ liệu **MySQL** và giao diện **Blade Template + Bootstrap 4**.

---

## 1. Yêu cầu hệ thống máy trạm
- PHP >= 8.2 (Cài đặt qua XAMPP 8.2, Laragon hoặc Homebrew/apt)
- Composer >= 2.x
- MySQL Server >= 8.0 (hoặc MariaDB >= 10.4)
- Node.js & npm (nếu biên dịch asset Vite)

---

## 2. Các bước cài đặt và khởi chạy máy chủ Laravel

### Bước 1: Di chuyển vào thư mục dự án và cài đặt Composer dependencies
```bash
cd laravel
composer install
```

### Bước 2: Tạo tệp cấu hình môi trường `.env`
```bash
cp .env.example .env
php artisan key:generate
```

### Bước 3: Cấu hình thông tin kết nối CSDL trong tệp `.env`
Mở file `.env` và thiết lập thông số MySQL của máy trạm:
```ini
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fashion_shop
DB_USERNAME=root
DB_PASSWORD=
```
*(Lưu ý: Tạo database `fashion_shop` trong phpMyAdmin hoặc MySQL Workbench trước khi chạy migration)*

### Bước 4: Chạy Migrations và Seeder dữ liệu mẫu
Lệnh này sẽ tự động khởi tạo cấu trúc bảng (Users, Categories, Products, Variants, Cart, Orders) và chèn 15 sản phẩm cùng tài khoản mẫu:
```bash
php artisan migrate:fresh --seed --seeder=FashionDemoSeeder
```

### Bước 5: Khởi động máy chủ phát triển
```bash
php artisan serve
```
Truy cập ứng dụng tại: `http://127.0.0.1:8000`

---

## 3. Tài khoản đăng nhập kiểm thử (Mật khẩu: `DemoShop2026!`)
- **Quản trị viên (Admin):** `admin@example.test` (Toàn quyền quản lý Danh mục, Sản phẩm, Đơn hàng)
- **Khách hàng A (User):** `usera@example.test`
- **Khách hàng B (User):** `userb@example.test`
