# Web3 Drive Platform Pro

A live Web3 drive MVP with Petra Wallet authentication, a dedicated backend, custom domains, and an end-to-end wallet login flow.

## Live

- **App:** https://app.shelbyy.xyz
- **API:** https://api.shelbyy.xyz
- **Documentation:** https://docs.shelby.xyz/

## Overview

`web3-drive-platform-pro` is a more serious Aptos-oriented Web3 storage MVP.

The project currently includes:
- a React + Vite frontend
- an Express backend
- Petra authentication using **nonce → sign message → verify → JWT**
- file upload
- file listing
- basic folder creation
- dedicated domains for both app and API
- live deployment through Vercel + VPS + Nginx + PM2

## Current Status

The project is currently working at a **live MVP** level:

- sign in with **Petra Wallet**
- backend wallet authentication through **nonce + signature + JWT**
- successful file upload
- uploaded file listing
- on-chain status placeholder for future integration
- frontend live at `app.shelbyy.xyz`
- backend live at `api.shelbyy.xyz`

## Current Architecture

```text
web3-drive-platform-pro/
├── frontend/        # React + Vite
├── backend/         # Express API + auth + file/folder routes
├── contracts/       # Aptos Move scaffolding
└── README.md
```

## Main Components

### Frontend
- React + Vite
- Petra wallet connect
- signed-message wallet authentication
- workspace-style UI
- file upload
- basic folder creation
- file listing
- loading / toast / empty states

### Backend
- Express
- JWT auth
- `POST /auth/nonce`
- `POST /auth/verify`
- `GET /auth/me`
- basic file and folder routes
- stable VPS process management with **PM2**

### Deployment
- frontend: **Vercel**
- backend: **VPS + Nginx + SSL + PM2**
- app domain: `app.shelbyy.xyz`
- api domain: `api.shelbyy.xyz`

## Current Storage and Metadata Mode

The app is currently running in fallback mode:

- **Storage:** `local-fallback`
- **Metadata:** `local-json-fallback`

That means:
- uploaded files are currently stored locally on the VPS
- metadata is currently stored in a local JSON file

This setup is good for a working MVP, but it is not the final production storage/database setup.

## Run Locally

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Environment Variables

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

> `DATABASE_URL` and R2 config are still optional right now. If they are not provided, the app runs in local fallback mode.

## Current Authentication Flow

1. The user connects Petra Wallet
2. The frontend calls `POST /auth/nonce`
3. Petra signs the authentication message
4. The frontend calls `POST /auth/verify`
5. The backend issues a JWT
6. The frontend uses that token for file/folder API requests

## Main API Routes

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

## What Already Works

- live app with a custom domain
- live API with a custom domain
- working Petra authentication
- working file upload
- working file list rendering
- stable backend process with PM2
- built-in documentation link inside the app

## Current Limitations

The project should not be presented as a fully production-ready system yet because it still lacks:

- PostgreSQL in the main live flow
- Cloudflare R2 in the main live flow
- move / rename file-folder flows
- a complete shared-with-me UI
- search / pagination / quota
- stronger logging / rate limiting / validation
- fully deployed Aptos contract + real on-chain metadata flow
- automated tests

## Future Improvements

1. move metadata from `local-json-fallback` to **PostgreSQL + Prisma**
2. move file storage from `local-fallback` to **Cloudflare R2**
3. improve folder workflow:
   - open folder
   - upload into folder
   - move / rename / delete
4. expand the sharing flow
5. connect a real Aptos Move contract for on-chain metadata
6. add file preview and more polished UI states
7. add validation, logging, rate limiting, and tests

## Notes

The current version is optimized to:
- prove a real Web3 MVP can run live
- show a working frontend, backend, custom domain, SSL, and wallet auth flow
- serve as a foundation for future upgrades to real storage, real database, and real on-chain integration
