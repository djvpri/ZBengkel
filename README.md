# 🔧 Bengkel POS

Sistem POS Bengkel Motor, Mobil & Alat Berat  
**Stack:** Next.js 14 + Prisma + PostgreSQL + NextAuth.js

---

## ⚡ Deploy ke Railway (Langkah Cepat)

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "init: bengkel-pos"
git remote add origin https://github.com/USERNAME/bengkel-pos.git
git push -u origin main
```

### 2. Buat Railway Project
1. Buka [railway.app](https://railway.app) → **New Project**
2. Pilih **Deploy from GitHub repo** → pilih repo ini
3. Tambah service **PostgreSQL** dari Railway dashboard

### 3. Set Environment Variables di Railway
Buka tab **Variables** di service app, tambahkan:
```
DATABASE_URL        → (Railway otomatis isi dari PostgreSQL service)
NEXTAUTH_SECRET     → string acak 32+ karakter (gunakan: openssl rand -base64 32)
NEXTAUTH_URL        → https://nama-app.up.railway.app
FONNTE_TOKEN        → (opsional, untuk notif WA)
WA_ADMIN_NUMBER     → (opsional, format: 628xxxxxxxxxx)
NEXT_PUBLIC_BENGKEL_NAMA   → nama bengkel kamu
NEXT_PUBLIC_BENGKEL_ALAMAT → alamat bengkel
NEXT_PUBLIC_BENGKEL_TELP   → nomor telp
```

### 4. Jalankan Migrasi & Seed Database
Di Railway terminal (atau Railway CLI):
```bash
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### 5. Akun Default Setelah Seed
| Role    | Email                   | Password    |
|---------|-------------------------|-------------|
| Admin   | admin@bengkel.com       | admin123    |
| Kasir   | kasir@bengkel.com       | kasir123    |
| Mekanik | mekanik@bengkel.com     | mekanik123  |

> ⚠️ **Segera ganti password** setelah login pertama!

---

## 🗂️ Fitur

| Modul          | Admin | Kasir | Mekanik |
|----------------|-------|-------|---------|
| Dashboard      | ✅    | ✅    | ✅      |
| Work Order     | ✅    | ✅    | 👁      |
| Kasir          | ✅    | ✅    | —       |
| Spare Part     | ✅    | —     | —       |
| Mekanik        | ✅    | —     | —       |
| Kendaraan      | ✅    | ✅    | —       |
| Laporan PDF    | ✅    | —     | —       |
| Riwayat Servis | ✅    | ✅    | —       |
| Kelola User    | ✅    | —     | —       |
| Notif WA Stok  | ✅    | —     | —       |

---

## 💻 Development Lokal

```bash
npm install
cp .env.example .env   # isi DATABASE_URL dan NEXTAUTH_SECRET
npx prisma db push
npm run db:seed
npm run dev
```

---

## 📦 Build Script

Railway akan otomatis menjalankan:
```
npm run build  →  prisma generate + next build
npm start      →  next start
```
