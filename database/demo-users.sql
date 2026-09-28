-- SILLAPA coursework demo accounts
-- Run after schema.sql. These public credentials are for demonstration only.
-- Password for all accounts: ArtDemo2026!

INSERT INTO art.users (id, email, password_hash, name, role, bio, university, active)
VALUES
  (
    'demo-customer',
    'customer@demo.local',
    '0dc479a519ff1e2b10f441f5381404d8:7fd1ea55f8f40c7fafc5a2ffae68cb2c4eed8f63e01c79aee3cf300449dbe50f9cf81074d8c14f8dff01e2c519dc92ec0488473514c86365e523cb22db125ed4',
    'นักสะสมตัวอย่าง',
    'customer',
    '',
    '',
    TRUE
  ),
  (
    'demo-artist',
    'artist@demo.local',
    '0dc479a519ff1e2b10f441f5381404d8:7fd1ea55f8f40c7fafc5a2ffae68cb2c4eed8f63e01c79aee3cf300449dbe50f9cf81074d8c14f8dff01e2c519dc92ec0488473514c86365e523cb22db125ed4',
    'พิมพ์ชนก วัฒนศิลป์',
    'staff',
    'บัญชีศิลปินสำหรับสาธิตการอัปโหลดและจัดการผลงาน',
    'คณะศิลปกรรมศาสตร์',
    TRUE
  ),
  (
    'demo-admin',
    'admin@demo.local',
    '0dc479a519ff1e2b10f441f5381404d8:7fd1ea55f8f40c7fafc5a2ffae68cb2c4eed8f63e01c79aee3cf300449dbe50f9cf81074d8c14f8dff01e2c519dc92ec0488473514c86365e523cb22db125ed4',
    'ผู้ดูแลศิลปะ',
    'admin',
    '',
    '',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  bio = EXCLUDED.bio,
  university = EXCLUDED.university,
  active = TRUE;

