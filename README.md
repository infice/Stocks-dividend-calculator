# ต้นทุน (Tonthun)

แอปบันทึกการลงทุนและคำนวณกำไรหุ้นสำหรับมือถือและเว็บ สร้างด้วย Expo, React Native, TypeScript และ Supabase โดยใช้แนวทางภาพจาก Untitled UI

## สิ่งที่ใช้งานได้แล้ว

- สมัครสมาชิก เข้าสู่ระบบ ออกจากระบบ และกู้รหัสผ่านด้วย Supabase Auth
- สร้าง แก้ไข archive และนำบัญชีโบรกเกอร์กลับมาใช้ พร้อม optimistic revision
- บันทึก แก้ไข ค้นหา และยกเลิกรายการซื้อ/ขายเป็น draft หรือ confirmed
- โหลดข้อมูลจริงจาก Supabase และแสดงภาพรวม พอร์ต รายการ และที่มาของกำไร
- คำนวณ FIFO และ Moving Average ด้วย decimal arithmetic
- ป้องกันข้อมูลข้ามผู้ใช้ด้วย Row Level Security (RLS)
- idempotency, optimistic revision conflict, audit trail และ private evidence bucket
- ป้องกันขายเกินจำนวนและป้องกันเปลี่ยนวิธีต้นทุนย้อนหลังโดยไม่มี replay ที่ฐานข้อมูล
- สถานะ loading, empty, offline/stale และ error สำหรับการใช้งานจริง

ฟีเจอร์ที่ยังไม่เปิดใช้ใน UI จะถูกแสดงเป็น unavailable แทนการสร้างข้อมูลจำลอง ได้แก่ AI/OCR, การอัปโหลดหลักฐาน, market data, corporate actions, money events และรายงานฉบับเต็ม

## ตั้งค่า

คัดลอก `.env.example` เป็น `.env.local` และใส่ค่าจาก Supabase project:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
EXPO_PUBLIC_AUTH_REDIRECT_URL=tonthun://auth/callback
```

เพิ่มค่า `EXPO_PUBLIC_AUTH_REDIRECT_URL` ใน Supabase Authentication > URL Configuration > Redirect URLs ด้วย หาก deploy เว็บให้เปลี่ยนเป็น URL ของเว็บจริง

จากนั้นรัน:

```bash
npm install
npm run start
```

คำสั่งตรวจสอบ:

```bash
npm test
npm run lint
npm run typecheck
npx expo-doctor
```

## Supabase

- migrations อยู่ที่ `supabase/migrations`
- ตาราง public ทุกตารางเปิด RLS และจำกัดข้อมูลตาม `auth.uid()`
- client ใช้ publishable key เท่านั้น ห้ามใส่ secret/service-role keyในตัวแอป
- RPC สำหรับการเขียนข้อมูลรองรับ idempotency key และ expected revision

## โครงสร้างหลัก

- `src/app` — routes และหน้าจอด้วย Expo Router
- `src/components` — UI components ที่ใช้ร่วมกัน
- `src/providers` — auth และ financial-data state
- `src/services` — Supabase repository, mappers และ portfolio view
- `src/domain/portfolio` — calculation core และ regression tests
- `supabase/migrations` — schema, RLS, RPC, audit และ indexes
- `doc` — requirements, SRS และ implementation backlog ต้นฉบับ
