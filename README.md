# Web3 Drive Platform Pro v2.0

> Nền tảng lưu trữ phi tập trung trên Aptos — React + Node.js + PostgreSQL + Cloudflare R2 + Move Contract

---

## 🏗️ Kiến trúc

```
web3-drive-platform-pro/
├── frontend/          # React + Vite
│   └── src/
│       ├── App.jsx            # UI chính: upload, folder, share, on-chain
│       ├── styles.css         # Design system production-grade
│       └── lib/
│           ├── api.js         # Axios-free fetch wrapper + JWT auth
│           └── petra.js       # Petra wallet: connect, sign, submit tx
│
├── backend/           # Node.js + Express + Prisma
│   ├── prisma/
│   │   └── schema.prisma      # users, files, folders, file_shares
│   └── src/
│       ├── server.js          # Entry point
│       ├── middleware/
│       │   └── auth.js        # JWT verify middleware
│       ├── routes/
│       │   ├── auth.js        # POST /auth/nonce + /auth/verify + GET /auth/me
│       │   ├── files.js       # CRUD files + download presigned + share
│       │   └── folders.js     # CRUD folders
│       └── lib/
│           ├── prisma.js      # Prisma client singleton
│           └── storage.js     # Cloudflare R2 (S3) + local fallback
│
└── contracts/         # Move smart contract
    └── sources/
        └── drive_metadata.move  # init, add_file, delete_file, share_access, events
```

---

## ⚡ Tính năng mới (v2.0)

### Backend
- ✅ **PostgreSQL + Prisma** — thay thế metadata.json mock
- ✅ **Cloudflare R2 storage** — thay thế local blobs
- ✅ **JWT Authentication** — Web3 native: nonce → Petra sign → JWT
- ✅ **Folder system** — tạo, xóa, nested folders
- ✅ **File sharing** — chia sẻ quyền read/write theo địa chỉ ví
- ✅ **Presigned download URL** — secure download từ R2
- ✅ **On-chain status update** — track txHash sau khi ghi contract

### Frontend
- ✅ **Auth flow đầy đủ** — connect Petra → sign nonce → JWT session
- ✅ **Grid/List view** — chuyển đổi layout
- ✅ **Drag & drop upload** — kéo file trực tiếp vào trang
- ✅ **Folder navigation** — breadcrumb, double-click mở folder
- ✅ **Share modal** — nhập địa chỉ ví để chia sẻ
- ✅ **Toast notifications** — feedback mọi action
- ✅ **Storage stats** — hiển thị dung lượng đã dùng

### Smart Contract
- ✅ **Events** — `FileAdded`, `FileDeleted`, `FileShared`
- ✅ **Soft delete** — giữ lịch sử on-chain
- ✅ **Access control** — `share_access`, `revoke_access`
- ✅ **View functions** — `get_file_count`, `has_access`

---

## 🚀 Cài đặt

### 1. Backend

```bash
cd backend
cp .env.example .env
# Điền DATABASE_URL, JWT_SECRET, R2 credentials vào .env

npm install
npx prisma db push      # Tạo tables trong PostgreSQL
npm run dev
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:8787

npm install
npm run dev
```

### 3. Deploy Contract (Aptos)

```bash
cd contracts
aptos move compile
aptos move publish --profile default
# Sau đó cập nhật MODULE_ADDRESS trong frontend/src/App.jsx
```

---

## 🔧 Biến môi trường

### Backend `.env`
```
DATABASE_URL=postgresql://USER:PASS@localhost:5432/web3drive
JWT_SECRET=your-secret-key
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=web3-drive-files
R2_PUBLIC_URL=https://...r2.dev
```

### Frontend `.env`
```
VITE_API_BASE_URL=http://localhost:8787
```

---

## 🗺️ Roadmap tiếp theo

- [ ] File preview (image/PDF/video in-browser)
- [ ] IPFS integration option
- [ ] On-chain file hash verification
- [ ] Aptos Indexer để query lịch sử on-chain
- [ ] Mobile responsive sidebar
- [ ] Rate limiting + file virus scan
