import type { DB } from './db';
import { hashPassword } from './password';
import { randomBytes } from 'node:crypto';
export async function seedLocal(db: DB, remote = false) {
  if ((await db.query('SELECT id FROM art.users LIMIT 1')).length) return;
  const password = await hashPassword(remote ? randomBytes(48).toString('hex') : 'ArtDemo2026!');
  await db.transaction(async tx => {
    for (const [id,email,name,role,bio,university] of [
      ['demo-admin','admin@demo.local','ผู้ดูแลศิลปะ','admin','',''],
      ['demo-artist','artist@demo.local','พิมพ์ชนก วัฒนศิลป์','staff','ชอบเล่าเรื่องธรรมชาติและความทรงจำผ่านสีและฝีแปรง พื้นที่นี้เป็นโปรไฟล์ตัวอย่างสำหรับทดลองระบบ','คณะศิลปกรรมศาสตร์'],
      ['demo-artist2','artist2@demo.local','ธนกฤต สีคราม','staff','ทดลองจังหวะของสี แสง และรูปทรงในชีวิตประจำวัน — โปรไฟล์สาธิต','สาขาทัศนศิลป์'],
      ['demo-customer','customer@demo.local','นักสะสมตัวอย่าง','customer','','']
    ]) await tx.query('INSERT INTO art.users(id,email,password_hash,name,role,bio,university) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,email,password,name,role,bio,university]);
    for (const [id,name] of [['painting','จิตรกรรม'],['landscape','ทิวทัศน์'],['portrait','ภาพบุคคล'],['still-life','หุ่นนิ่ง']])
      await tx.query('INSERT INTO art.categories(id,name) VALUES($1,$2)',[id,name]);
    const pieces = [
      ['แสงบ่ายในสวน','landscape',4200,'สีน้ำมันบนผ้าใบ',60,80],
      ['แสงบ่ายริมหน้าผา','landscape',2800,'สีน้ำมันบนผ้าใบ',40,50],
      ['บทสนทนาของดอกไม้','still-life',6500,'สีน้ำมันบนผ้าใบ',80,100],
      ['ความเงียบที่มีสีสัน','still-life',3600,'สีน้ำมันบนผ้าใบ',50,60],
      ['จังหวะของความรู้สึก','painting',5200,'สีน้ำมันบนผ้าใบ',60,80],
      ['ภาพสะท้อนตัวตน','portrait',3900,'สีน้ำมันบนผ้าใบ',50,70],
      ['ผลไม้ในแสงเช้า','still-life',2400,'สีน้ำมันบนผ้าใบ',40,40],
      ['สวนในความทรงจำ','landscape',4800,'สีน้ำมันบนผ้าใบ',60,60]
    ];
    for (let i=0;i<pieces.length;i++) {
      const [title,category,price,technique,width,height] = pieces[i];
      await tx.query(`INSERT INTO art.artworks(id,artist_id,category_id,title,description,technique,width,height,price,image,status,credit,source_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [`sample-${i+1}`,i%2?'demo-artist2':'demo-artist',category,title,'ผลงานตัวอย่างสำหรับทดลองเลือกซื้อและจัดการร้าน ภาพประกอบเป็นศิลปะสาธารณสมบัติ ไม่ใช่ผลงานที่สร้างโดยนักศึกษาตามชื่อโปรไฟล์ ชื่อ ราคา และขนาดในรายการเป็นข้อมูลสมมติ',technique,width,height,Number(price)*100,`/art/art-${i+1}.jpg`,i===7?'pending':'approved','ภาพสาธารณสมบัติ · ดูชื่อผู้สร้างจริงและแหล่งที่มาในเครดิตภาพ','/credits'] );
    }
  });
}
