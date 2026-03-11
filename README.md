# Web3 Drive Platform Pro

MVP Web3 drive chạy thực tế với Petra Wallet, backend riêng, domain riêng và luồng xác thực ví hoàn chỉnh.

## Live

- **App:** https://app.shelbyy.xyz
- **API:** https://api.shelbyy.xyz
- **Documentation:** https://docs.shelby.xyz/

## Tổng quan

`web3-drive-platform-pro` là bản MVP nghiêm túc hơn cho một ứng dụng lưu trữ Web3 trên Aptos.

Hiện tại dự án đã có:
- frontend React + Vite
- backend Express
- xác thực bằng Petra theo flow **nonce → sign message → verify → JWT**
- upload file
- danh sách file
- tạo folder cơ bản
- domain riêng cho app và API
- triển khai live qua Vercel + VPS + Nginx + PM2

## Trạng thái hiện tại

Dự án hiện đã chạy được ở mức **MVP live**:

- đăng nhập bằng **Petra Wallet**
- backend xác thực ví qua **nonce + signature + JWT**
- upload file thành công
- hiển thị danh sách file đã upload
- có trạng thái on-chain ở mức chuẩn bị tích hợp
- frontend chạy tại `app.shelbyy.xyz`
- backend chạy tại `api.shelbyy.xyz`

## Kiến trúc hiện tại

```text
web3-drive-platform-pro/
├── frontend/        # React + Vite
├── backend/         # Express API + auth + file/folder routes
├── contracts/       # Aptos Move scaffolding
└── README.md
```

## Thành phần chính

### Frontend
- React + Vite
- Petra wallet connect
- sign message để xác thực ví
- giao diện workspace
- upload file
- tạo folder cơ bản
- danh sách file
- trạng thái loading / toast / empty state

### Backend
- Express
- JWT auth
- route `POST /auth/nonce`
- route `POST /auth/verify`
- route `GET /auth/me`
- file routes và folder routes cơ bản
- chạy ổn định bằng **PM2** trên VPS

### Deploy
- frontend: **Vercel**
- backend: **VPS + Nginx + SSL + PM2**
- app domain: `app.shelbyy.xyz`
- api domain: `api.shelbyy.xyz`

## Storage và metadata hiện tại

Hiện app đang chạy ở chế độ fallback:

- **Storage:** `local-fallback`
- **Metadata:** `local-json-fallback`

Điều đó có nghĩa là:
- file hiện đang lưu local trên VPS
- metadata hiện đang lưu bằng JSON local

Cách này phù hợp để chạy MVP nhanh, nhưng chưa phải cấu hình production hoàn chỉnh.

## Cách chạy local

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Biến môi trường

### Frontend

```env
VITE_API_BASE_URL=https://api.shelbyy.xyz
VITE_APTOS_MODULE_ADDRESS=0x_your_module_address
```

### Backend

```env
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
PORT=8787
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/web3drive
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

> `DATABASE_URL` và cấu hình R2 hiện vẫn là tùy chọn. Nếu chưa có, app sẽ chạy bằng fallback local.

## Luồng xác thực hiện tại

1. Người dùng kết nối Petra Wallet
2. Frontend gọi `POST /auth/nonce`
3. Petra ký message xác thực
4. Frontend gọi `POST /auth/verify`
5. Backend cấp JWT
6. Frontend dùng token để gọi các API file/folder

## API chính

### Auth
- `POST /auth/nonce`
- `POST /auth/verify`
- `GET /auth/me`

### Folders
- `GET /api/folders`
- `POST /api/folders`
- `DELETE /api/folders/:id`

### Files
- `GET /api/files`
- `POST /api/files/upload`
- `GET /api/files/:id/download`
- `DELETE /api/files/:id`
- `POST /api/files/:id/share`
- `PATCH /api/files/:id/onchain`

## Điểm đã làm được

- app live với domain riêng
- api live với domain riêng
- Petra auth chạy được
- upload file chạy được
- file list hiển thị được
- backend chạy nền ổn định bằng PM2
- documentation link tích hợp sẵn trong app

## Giới hạn hiện tại

Dự án chưa nên coi là production hoàn chỉnh vì vẫn còn thiếu:

- PostgreSQL thật trong luồng chạy chính
- Cloudflare R2 thật trong luồng chạy chính
- move / rename file-folder
- shared-with-me UI hoàn chỉnh
- search / pagination / quota
- logging / rate limiting / validation chặt hơn
- Aptos contract deploy thật + metadata on-chain thật
- test automation

## Hướng phát triển thêm

1. chuyển metadata từ `local-json-fallback` sang **PostgreSQL + Prisma**
2. chuyển file storage từ `local-fallback` sang **Cloudflare R2**
3. hoàn thiện workflow folder:
   - mở folder
   - upload theo folder
   - move / rename / delete
4. bổ sung chia sẻ file hoàn chỉnh hơn
5. nối Aptos Move contract thật để lưu metadata on-chain
6. thêm preview file và polish giao diện
7. thêm validation, logging, rate limit và test

## Ghi chú

Bản hiện tại được tối ưu để:
- chứng minh khả năng triển khai một Web3 MVP thật
- có frontend live, backend live, domain riêng, SSL và auth flow hoạt động
- làm nền tảng để nâng tiếp lên storage thật, database thật và on-chain thật
