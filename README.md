# EShopper — Dự án nhóm 5 người

Ứng dụng Laravel chính nằm trong **eshopper/**. Bắt đầu tại [hướng dẫn cài đặt và nhập database](eshopper/README.md), sau đó đọc [checklist chung](eshopper/BAT_DAU_CUNG_NHAU.md).

| Thành viên | Phần việc | Hướng dẫn |
|---|---|---|
| Kiều | Auth, CN06 quản lý đơn, tích hợp | [Người 1](eshopper/README_NGUOI_1.md) |
| Danh | CN02 sản phẩm và biến thể | [Người 2](eshopper/README_NGUOI_2.md) |
| Anh Tú | CN05 đặt hàng | [Người 3](eshopper/README_NGUOI_3.md) |
| Châu | CN01 danh mục, giao diện | [Người 4](eshopper/README_NGUOI_4.md) |
| Nhựt | CN03 tìm/lọc, CN04 giỏ hàng | [Người 5](eshopper/README_NGUOI_5.md) |

Database mẫu: [fashion_shop.sql](eshopper/database/fashion_shop.sql). Mỗi người import một lần vào MySQL riêng theo hướng dẫn. Dùng các model, bảng, service và dữ liệu mẫu đã có để làm song song; không cần đợi người khác hoàn thành giao diện.

Đây là bộ nền để nhóm tiếp tục CN01–CN06, chưa phải website hoàn chỉnh. Theo [hợp đồng chung](eshopper/CONTRACTS.md), [lịch 7 ngày](eshopper/LO_TRINH.md) và [quy trình Git](eshopper/README_GIT_WORKFLOW.md).

Thư mục DuAnLTMNM giữ tài liệu/bản cũ; mysql-8.4 là dữ liệu MySQL cục bộ, không dùng để cài database cho thành viên. Không commit thêm dữ liệu MySQL hoặc .env.
