# ฐานข้อมูลสำหรับส่งงาน

โฟลเดอร์นี้เก็บ **โครงสร้างฐานข้อมูล** ที่อาจารย์สามารถเปิดตรวจได้ โดยไม่มีข้อมูลลูกค้า ที่อยู่ สลิป หรือรหัสลับจริง

## ไฟล์

- `schema.sql` — PostgreSQL schema ทั้งหมดของระบบ: ผู้ใช้และสิทธิ์ ผลงาน หมวดหมู่ คำสั่งซื้อ ที่อยู่ สื่อ Session และ Audit log
- โค้ดสร้างข้อมูลสาธิตอยู่ใน `lib/seed.ts`
- ตัวติดตั้งฐานข้อมูลอยู่ใน `scripts/setup.ts`

## ทดลองในเครื่อง

```bash
npm install
npm run dev
```

ระบบจะสร้างฐานข้อมูล PGlite และบัญชีทดลองให้อัตโนมัติ:

| สิทธิ์ | อีเมล | รหัสผ่าน |
|---|---|---|
| ลูกค้า | `customer@demo.local` | `ArtDemo2026!` |
| ศิลปิน | `artist@demo.local` | `ArtDemo2026!` |
| แอดมิน | `admin@demo.local` | `ArtDemo2026!` |

## ใช้กับ Vercel

Vercel ต้องใช้ PostgreSQL ภายนอก เช่น Supabase เพราะพื้นที่ไฟล์ของ Serverless ไม่ถาวร

1. ตั้ง `DATABASE_URL` ใน `.env.local` ด้วย Supabase Transaction Pooler URL
2. ตั้ง `ADMIN_EMAIL` และ `ADMIN_PASSWORD` สำหรับสร้างแอดมินคนแรก
3. รัน `npm run db:setup` หนึ่งครั้ง
4. นำ `DATABASE_URL` และ `APP_URL` ไปตั้งใน Vercel แล้ว Redeploy

อย่า commit `.env.local`, รหัสผ่านฐานข้อมูล, ข้อมูลลูกค้า หรือโฟลเดอร์ `.data/`
