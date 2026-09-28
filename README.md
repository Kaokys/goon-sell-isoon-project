# SILLAPA — Art Marketplace

เว็บขายผลงานศิลปะภาษาไทย: Next.js / React / TypeScript + PostgreSQL รองรับ GitHub, Vercel และฐานข้อมูล Neon ที่สร้างจาก Vercel Marketplace

ไฟล์ SQL สำหรับส่งงานและตรวจโครงสร้างฐานข้อมูลอยู่ใน [`database/`](database/README.md) โดยไม่มีข้อมูลลูกค้าหรือรหัสลับจริง

## เริ่มใช้งานในเครื่อง

ต้องใช้ Node.js 20.9 ขึ้นไป (ทดสอบด้วย Node 22)

```powershell
npm ci
npm run dev
```

เปิด http://localhost:3000 ระบบจะสร้าง PostgreSQL แบบฝังตัวด้วย PGlite ใน `.data/postgres` ให้อัตโนมัติ ข้อมูลยังอยู่หลังปิดและเปิดโปรแกรมใหม่ ห้ามเปิดหลายโปรเซสกับโฟลเดอร์ฐานข้อมูลเดียวกัน

### Google Login

สร้าง OAuth 2.0 Client ชนิด **Web application** ใน Google Cloud Console แล้วตั้ง Authorized redirect URI เป็น `http://localhost:3000/api/auth/google/callback` สำหรับเครื่อง และ `https://โดเมน-vercel/api/auth/google/callback` สำหรับ Production จากนั้นใส่ `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET` ใน `.env.local` หรือ Vercel Environment Variables ผู้ใช้ Google ใหม่จะถูกสร้างเป็น `customer` และอีเมลต้องผ่านการยืนยันจาก Google

| บทบาท | อีเมลทดลอง | รหัสผ่าน |
|---|---|---|
| Admin | admin@demo.local | ArtDemo2026! |
| Staff / ศิลปิน | artist@demo.local | ArtDemo2026! |
| Customer | customer@demo.local | ArtDemo2026! |

บัญชีทดลองมีเฉพาะฐานข้อมูลในเครื่อง อย่าโอนเงินจริงในโหมดทดลอง

## ฟีเจอร์ขั้นต่ำ

- สมัครสมาชิกและเข้าสู่ระบบจริง: รหัสผ่าน scrypt, session token แบบสุ่ม เก็บเฉพาะ hash ในฐานข้อมูล, HttpOnly cookie, ตรวจ Origin สำหรับการเปลี่ยนข้อมูล
- ผู้สมัครใหม่ได้สิทธิ์ customer เท่านั้น สามารถขอสิทธิ์ศิลปินให้ admin อนุมัติได้
- แกลเลอรีค้นหาชื่อผลงาน/ศิลปิน กรองหมวด ศิลปิน ราคา สถานะ เรียงราคา/วัน และแบ่งหน้า
- รายละเอียดภาพ ขนาด เทคนิค ราคา สถานะ และโปรไฟล์ศิลปิน
- CRUD ผลงานและหมวดหมู่ พร้อมตรวจข้อมูลทั้งฟอร์มและเซิร์ฟเวอร์
- Staff จัดการได้เฉพาะผลงานของตน; Admin ตรวจอนุมัติ/ส่งกลับแก้ไขก่อนเผยแพร่ การแก้ไขผลงานจะกลับเข้าคิว
- ตะกร้าในเบราว์เซอร์ คำสั่งซื้อจริงในฐานข้อมูล ราคาคำนวณที่เซิร์ฟเวอร์ จองสินค้าภายใน transaction พร้อม row lock และ idempotency ป้องกันการกดซ้ำ
- Checkout แบบ marketplace: ที่อยู่จัดส่งอยู่ด้านบน แยกสินค้า/การจัดส่ง/วิธีจ่าย และสรุปยอดก่อนยืนยัน
- สมุดที่อยู่ `/addresses` เพิ่ม แก้ไข ลบ สูงสุด 20 รายการ ตั้งค่าเริ่มต้น และบันทึกแยกตามบัญชี
- เลือกจังหวัด → อำเภอ/เขต → ตำบล/แขวง แล้วเติมรหัสไปรษณีย์จากข้อมูลอ้างอิงไทย ตรวจความสัมพันธ์ฝั่งเซิร์ฟเวอร์
- เลือก PromptPay หรือโอนธนาคาร บันทึกข้อความถึงร้านและวิธีจ่ายในคำสั่งซื้อ ที่อยู่ถูกคัดลอกเก็บ ณ เวลาสั่งซื้อ การแก้สมุดที่อยู่ภายหลังไม่เปลี่ยนออเดอร์เดิม
- PromptPay QR ตามยอดสั่งซื้อเมื่อกำหนดผู้รับจริง อัปโหลดสลิปส่วนตัว Admin ยืนยันหรือปฏิเสธพร้อมเหตุผล
- สถานะ รอชำระ → ชำระแล้ว → จัดส่ง → สำเร็จ พร้อมเลขพัสดุและยกเลิกก่อนชำระ
- Dashboard ยอดขายที่รับชำระแล้ว รายเดือน และรายศิลปิน
- Audit log สำหรับการสมัคร แก้โปรไฟล์ สิทธิ์ผู้ใช้ ผลงาน หมวดหมู่ คำสั่งซื้อ สลิป และสถานะ
- Admin ปิดใช้งานบัญชีแทนการลบเพื่อรักษาประวัติคำสั่งซื้อ

## เส้นทางหลัก

`/` แกลเลอรี · `/artists` ศิลปิน · `/artworks/:id` รายละเอียด · `/cart` ตะกร้า · `/orders` คำสั่งซื้อ · `/profile` โปรไฟล์ · `/studio` พื้นที่ศิลปิน

Admin Portal แยกที่ `/admin` พร้อมหน้าเข้าสู่ระบบเฉพาะแอดมิน: `/admin/artworks` อนุมัติผลงาน · `/admin/orders` จัดการออเดอร์ · `/admin/users` จัดการผู้ใช้ · `/admin/categories` หมวดหมู่ · `/admin/logs` ประวัติ

## ขึ้น GitHub + Vercel

1. Import GitHub repository นี้เข้า Vercel และเลือก Framework **Next.js**
2. ใน Vercel เปิด **Storage → Marketplace → Neon** เลือกแผน Free แล้วเชื่อมฐานข้อมูลกับโปรเจกต์ Vercel จะเพิ่ม `DATABASE_URL` ให้อัตโนมัติ
3. เปิด Neon Console จากหน้า Storage ของ Vercel แล้วรัน [`database/schema.sql`](database/schema.sql) ตามด้วย [`database/demo-users.sql`](database/demo-users.sql)
4. ใน Vercel Environment Variables เพิ่ม `APP_URL` เป็น URL จริง เช่น `https://ชื่อร้าน.vercel.app`
5. ถ้าต้องการรับเงินจริงจึงเพิ่ม `PROMPTPAY_ID`, `PROMPTPAY_NAME` หรือข้อมูลบัญชีธนาคาร ห้ามใช้ข้อมูลการเงินจริงในงานสาธิต
6. กด **Redeploy** แล้วใช้บัญชีทดลองสามสิทธิ์จากตารางด้านบน
7. เมื่อเปลี่ยนโดเมน ต้องเปลี่ยน `APP_URL` ให้ตรงและ redeploy เพราะระบบตรวจ Origin ป้องกัน CSRF

**โอนธนาคาร:** ตั้ง `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER` ครบทั้งสามค่าเพื่อเปิดตัวเลือกนี้บนเว็บออนไลน์ ระบบแสดงบัญชีและปุ่มคัดลอกหลังสั่งซื้อ ช่องทางที่ยังไม่ตั้งค่าจะกดเลือกไม่ได้ โหมด local เปิดตัวเลือกไว้เพื่อทดสอบ แต่ไม่มีบัญชีหรือ QR สมมติให้โอนเงินจริง

**อัปเดตฐานข้อมูลเดิม:** รัน `npm run db:setup` อีกครั้งก่อน deploy รุ่น Checkout/สมุดที่อยู่ สคริปต์เพิ่มตารางและคอลัมน์ด้วย `IF NOT EXISTS` โดยเก็บข้อมูลเดิม Local จะอัปเดตเมื่อเริ่มเซิร์ฟเวอร์ใหม่โดยอัตโนมัติ

ข้อมูลจังหวัด/อำเภอ/ตำบลอ้างอิงจาก [jquery.Thailand.js](https://github.com/earthchie/jquery.Thailand.js) เก็บใน `data/` พร้อมใบอนุญาต ไม่ส่งที่อยู่ลูกค้าไปบริการภายนอก และไม่ใช่บริการตรวจที่อยู่แบบสดของไปรษณีย์ไทย

Vercel ต้องมี `DATABASE_URL` เสมอ ระบบไม่ใช้ฐานข้อมูลบนดิสก์ชั่วคราวของ serverless และไม่สร้างตารางตอนรับคำขอจริง

ภาพอัปโหลดถูกตรวจสอบ/ย่อด้วย Sharp และเก็บเป็น binary ใน PostgreSQL schema `art` เช่นเดียวกับสลิป เพื่อลดขั้นตอนการตั้งค่าสำหรับโปรเจกต์นี้ ขนาดต้นฉบับไม่เกิน 3 MB; ภาพแสดงผลสูงสุด 1600px เหมาะกับงานขนาดเล็ก หากมีภาพจำนวนมากควรย้ายไป Object Storage ภายหลัง ภาพนี้ไม่ใช่ไฟล์ต้นฉบับสำหรับขายไฟล์ความละเอียดสูง

ตารางทั้งหมดอยู่ใน PostgreSQL schema `art` เว็บใช้ session และการตรวจสิทธิ์จาก Server API ของแอปเอง

เอกสารอ้างอิง: [Vercel Marketplace Storage](https://vercel.com/docs/marketplace-storage), [Postgres on Vercel](https://vercel.com/docs/postgres), [Neon for Vercel](https://vercel.com/marketplace/neon)

## ตรวจสอบ

```powershell
npm run typecheck
npm run build
npm run test:integration
npm run test:browser
```

ชุด integration เปิด production server ชั่วคราวที่ port 3100 และใช้ฐานข้อมูลทดสอบใหม่ใน `.data/tests/` ไม่เปลี่ยนข้อมูลร้านที่ port 3000

ชุด browser เปิด port 3101 และใช้ Microsoft Edge ผ่าน Playwright (ตั้ง `PLAYWRIGHT_CHANNEL=chrome` ได้หากใช้ Chrome) บันทึกผลที่ `docs/BROWSER-RESULTS.md` และภาพหน้าจอที่ `docs/screenshots/` ดูผลตรวจ API ที่ `docs/TEST-RESULTS.md` การทดสอบทั้งสองต้อง build ก่อน

บน Windows ดับเบิลคลิก `START-WINDOWS.cmd` เพื่อเริ่มเว็บได้ สคริปต์ติดตั้ง dependencies เฉพาะครั้งแรก จากนั้นเปิด http://localhost:3000 และปล่อยหน้าต่างคำสั่งไว้ขณะใช้งาน

## ขอบเขตและสิ่งที่ยังต้องตั้งค่า

- ต้อง Import GitHub เข้า Vercel และเพิ่ม Neon Postgres จาก Vercel Marketplace เพื่อให้ข้อมูลออนไลน์คงอยู่
- QR จะไม่ปรากฏจนกว่าจะตั้งผู้รับ PromptPay จริง การแนบสลิปไม่ได้ยืนยันการรับเงินโดยอัตโนมัติ
- คำสั่งซื้อรอชำระจะจองผลงานจนกว่าจะยกเลิก ไม่มีการหมดอายุการจองอัตโนมัติในรุ่นนี้
- ไม่มีส่งอีเมลยืนยัน/รีเซ็ตรหัสผ่าน และไม่มี gateway ตรวจสลิปอัตโนมัติ
- ฟีเจอร์เสริมในโจทย์ (ลายน้ำ ขายไฟล์ต้นฉบับ แบ่ง commission รับงานตามสั่ง รีวิว ถูกใจ ติดตาม และแนะนำภาพ) ยังไม่รวมในรุ่นขั้นต่ำนี้
- ภาพเริ่มต้นเป็นงานสาธารณสมบัติ/CC0 พร้อมเครดิตที่ `/credits` ชื่อสินค้า ขนาด ราคา และโปรไฟล์นักศึกษาเป็นข้อมูลสมมติ ห้ามเสนอขายภาพตัวอย่างว่าเป็นผลงานต้นฉบับของนักศึกษา

โครงสร้าง: `components/` หน้าจอ, `app/api/[...path]/route.ts` API, `lib/schema.ts` schema, `lib/auth.ts` session/permissions, `lib/db.ts` local/remote adapter, `scripts/setup.ts` เตรียมฐานข้อมูลออนไลน์
