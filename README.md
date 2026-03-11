# Web3 Drive Platform Pro

MVP full-stack cho web3 drive trên Aptos: frontend React/Vite, backend Express, auth Petra nonce → signature → JWT, CRUD folders/files có auth, storage qua Cloudflare R2 nếu cấu hình đủ và local fallback nếu chưa có hạ tầng.

## Trạng thái hiện tại

Đã chạy được ở mức MVP:
- Backend Express tách `routes/`, `middleware/`, `lib/`
- Auth flow Petra: `POST /auth/nonce` → ký message → `POST /auth/verify` → JWT
- Verify chữ ký Petra ở backend bằng `tweetnacl`
- CRUD tối thiểu cho folders/files có auth
- Download file từ R2 presigned URL hoặc local direct download
- Frontend nối flow auth, list/create folder, list/upload/delete/share file, loading/error/toast cơ bản
- Prisma/Postgres vẫn được support khi có `DATABASE_URL`
- Nếu chưa có Postgres thì backend fallback sang `backend/data/metadata.json`

Chưa nên claim là production hoàn chỉnh vì còn thiếu:
- refresh token / session revoke / rate limiting
- antivirus scan / file hash verification
- pagination / search / quota thật
- contract module address mặc định chưa cấu hình sẵn
- test automation còn chưa có

## Cấu trúc

```text
web3-drive-platform-pro/
├── backend/
│   ├── prisma/
│   └── src/
│       ├── lib/
│       ├── middleware/
│       ├── routes/
│       └── server.js
├── frontend/
│   └── src/
└── contracts/
```

## Chạy local

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Biến môi trường quan trọng:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/web3drive # optional nếu muốn dùng Prisma/Postgres
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
PORT=8787

# optional cho Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

Nếu có Postgres:

```bash
npm run db:generate
npm run db:push
```

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

`.env` mẫu:

```env
VITE_API_BASE_URL=http://localhost:8787
VITE_APTOS_MODULE_ADDRESS=0x_your_module_address
```

## Build

```bash
cd ..
npm run build
```

## API chính

- `POST /auth/nonce`
- `POST /auth/verify`
- `GET /auth/me`
- `GET/POST/DELETE /api/folders`
- `GET /api/files`
- `POST /api/files/upload`
- `GET /api/files/:id/download`
- `DELETE /api/files/:id`
- `PATCH /api/files/:id/onchain`
- `POST /api/files/:id/share`

## Gợi ý bước tiếp theo

1. Thêm rate limit + request logging + validation schema (zod/joi)
2. Viết test integration cho auth/files/folders
3. Thêm rename/move folder-file và recursive tree API
4. Lưu file hash + verify on-chain thật
5. Hoàn thiện shared-with-me view ở frontend
