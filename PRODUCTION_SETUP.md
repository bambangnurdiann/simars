# Panduan Instalasi & Deploy SIMAMAS (PA Pasarwajo)

Aplikasi ini dirancang untuk berjalan di jaringan lokal kantor (LAN) menggunakan IP rill komputer server.

## 1. Persiapan Database (PostgreSQL)
Pastikan PostgreSQL sudah terinstal di server kantor.
1. Buat database baru bernama `simamas_db`.
2. Buka file `prisma/schema.prisma`.
3. Kembalikan konfigurasi datasource ke PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Ubah kembali tipe data `@db.Text` dan `enum` di `schema.prisma` (lihat riwayat file).

## 2. Konfigurasi Environment (.env)
Buat file atau edit `.env` di root folder:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/simamas_db"
JWT_SECRET="isi-dengan-string-acak-rahasia"
PORT=3000
NODE_ENV=production
```

## 3. Instalasi & Build
Jalankan perintah berikut di terminal server:
```bash
# Instal dependensi
npm install

# Sinkronisasi Database
npx prisma db push

# Isi data awal (Seed)
npx prisma db seed

# Build aplikasi untuk produksi
npm run build
```

## 4. Jalankan dengan PM2 (Agar aplikasi tetap hidup)
```bash
npm install -g pm2
pm2 start dist/server.cjs --name "simamas-app"
pm2 save
pm2 startup
```

## 5. Mengakses via IP Lokal
Agar komputer lain dapat mengakses:
1. Pastikan Firewall server membuka port **3000**.
2. Ketahui IP server (misal: `192.168.1.10`).
3. Pegawai dapat mengakses via browser di alamat: `http://192.168.1.10:3000`.

## 6. Backup Database
Gunakan perintah `pg_dump` secara berkala:
```bash
pg_dump -U username simamas_db > backup_simamas.sql
```

Aplikasi siap digunakan oleh seluruh pegawai Pengadilan Agama Pasarwajo.
