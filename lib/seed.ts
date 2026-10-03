import type { DB } from './db';
import { hashPassword } from './password';
import { randomBytes } from 'node:crypto';

const samplePieces = [
 ['เบนจามินยาฮู — พลังสีฟ้า','painting',3000,'ภาพดิจิทัล',60,90,'ภาพมีมสีฟ้าที่ผู้ใช้แนบสำหรับโปรเจกต์สาธิต'],
 ['เบนจามินเทนนอสัน — พลังสีเขียว','painting',3000,'ภาพดิจิทัล',60,90,'ภาพมีมสีเขียวที่ผู้ใช้แนบสำหรับโปรเจกต์สาธิต']
] as const;
const sampleCredits = [['ภาพแนบจากเจ้าของโปรเจกต์',''],['ภาพแนบจากเจ้าของโปรเจกต์','']] as const;
// Seed metadata must never overwrite uploaded or edited records on startup.
export async function syncSampleArt(_db: DB) {}
export async function seedLocal(db: DB, remote = false) {
  if ((await db.query('SELECT id FROM art.users LIMIT 1')).length) return;
  const password = await hashPassword(remote ? randomBytes(48).toString('hex') : 'ArtDemo2026!');
  await db.transaction(async tx => {
    for (const [id,email,name,role,bio,university] of [
      ['demo-admin','admin@demo.local','ผู้ดูแลศิลปะ','admin','',''],
      ['demo-artist','benjamin.blue@demo.local','เบนจามินยาฮู','staff','ศิลปินมีมสีฟ้า — โปรไฟล์สาธิต','คณะศิลปกรรมศาสตร์'],
      ['demo-artist2','benjamin.green@demo.local','เบนจามินเทนนอสัน','staff','ศิลปินมีมสีเขียว — โปรไฟล์สาธิต','สาขาทัศนศิลป์'],
      ['demo-customer','customer@demo.local','นักสะสมตัวอย่าง','customer','','']
    ]) await tx.query('INSERT INTO art.users(id,email,password_hash,name,role,bio,university) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,email,password,name,role,bio,university]);
    for (const [id,name] of [['painting','งานศิลปะ']])
      await tx.query('INSERT INTO art.categories(id,name) VALUES($1,$2)',[id,name]);
    for (let i=0;i<samplePieces.length;i++) {
      const [title,category,price,technique,width,height,description] = samplePieces[i];
      const [credit,sourceUrl] = sampleCredits[i];
      await tx.query(`INSERT INTO art.artworks(id,artist_id,category_id,title,description,technique,width,height,price,image,status,credit,source_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [`sample-${i+1}`,i%2?'demo-artist2':'demo-artist',category,title,description,technique,width,height,Number(price)*100,`/art/art-${i+1}.jpg`,'approved',credit,sourceUrl] );
    }
  });
}

// Merge the old default categories without deleting any artworks or custom categories.
export async function simplifyCategories(db: DB) {
  await db.transaction(async tx=>{
    await tx.query("INSERT INTO art.categories(id,name) VALUES('painting','งานศิลปะ') ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name");
    await tx.query("UPDATE art.artworks SET category_id='painting' WHERE category_id IN ('illustration','landscape','portrait','still-life')");
    await tx.query("DELETE FROM art.categories WHERE id IN ('illustration','landscape','portrait','still-life')");
  });
}
