import type { DB } from './db';
import { hashPassword } from './password';
import { randomBytes } from 'node:crypto';

const samplePieces = [
  ['เมื่อมีลูกค้าสั่งมีม','portrait',3200,'ภาพมีมดิจิทัล',60,60,'สีหน้าของแมวเมื่อได้รับออร์เดอร์ให้ทำมีมใหม่แบบด่วนที่สุด'],
  ['สนุกครั้งเดียว เข็ดเลย','portrait',2900,'ภาพมีมดิจิทัล',60,60,'Grumpy Cat กับประโยคประจำใจสำหรับวันที่ทุกอย่างดูสนุกเกินไป'],
  ['วันจันทร์มาอีกแล้ว','portrait',2600,'ภาพมีมดิจิทัล',60,60,'สีหน้าของแมวที่พูดแทนใจเมื่อวันหยุดจบเร็วกว่าที่คิด'],
  ['แมวทำงานแทนฉันที','painting',3500,'ภาพมีมดิจิทัล',60,60,'แมวคีย์บอร์ดกำลังช่วยจัดการงานที่ค้างอยู่ให้เสร็จแบบมืออาชีพ'],
  ['โหมดอสูรแมว','portrait',3100,'ภาพมีมดิจิทัล',60,60,'เมื่อแมวธรรมดาเปิดโหมดจริงจังจนกลายเป็นเจ้าป่าในหนึ่งวินาที'],
  ['ขอแอบดูหน่อย','portrait',2800,'ภาพถ่ายแนวมีม',60,60,'เจ้าดัชชุนด์มองผ่านรั้วด้วยสีหน้าสงสัยว่าอีกฝั่งกำลังทำอะไรกัน'],
  ['ขอคำเดียวได้ไหม','still-life',3000,'ภาพถ่ายแนวมีม',60,60,'สายตาของน้องหมาที่พร้อมแลกทุกอย่างเพื่อคอร์นด็อกหนึ่งคำ'],
  ['ไม่พอใจ แต่ยังน่ารัก','portrait',2400,'ภาพถ่ายแนวมีม',60,60,'แมวอ้วนหน้าบึ้งที่ยังรักษาความน่ารักไว้ได้เต็มร้อย']
] as const;

const sampleCredits = [
  ['Jennifer Williams · CC BY-SA 2.0','https://commons.wikimedia.org/wiki/File:Cat_Meme.jpg'],
  ['Di (they-them) · CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Grumpy_Cat_meme_example.jpg'],
  ['PantheraLeo1359531 · CC BY 4.0','https://commons.wikimedia.org/wiki/File:MONDAY-Meme_Dsc5436.png'],
  ['slava / PlanespotterA320 · CC BY 2.0','https://commons.wikimedia.org/wiki/File:Expanding_ur_stubs.jpg'],
  ['Sev6nWiki · CC BY 4.0','https://commons.wikimedia.org/wiki/File:Beast_Cat_Original_(Meme).jpg'],
  ['mikapon · CC BY-SA 2.0','https://commons.wikimedia.org/wiki/File:Funny_dog.jpg'],
  ['Vkoid · CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Dog_wants_corndog.jpg'],
  ['TyedyeBrody · CC0 1.0','https://commons.wikimedia.org/wiki/File:Gracie_Seyranian_the_chunky_cat,_she%E2%80%99s_a_funny_cat_but_she%E2%80%99s_angry.jpg']
] as const;

export async function syncSampleArt(db: DB) {
  for (let i=0;i<samplePieces.length;i++) {
    const [title,category,price,technique,width,height,description] = samplePieces[i];
    const [credit,sourceUrl] = sampleCredits[i];
    await db.query(`UPDATE art.artworks SET category_id=$1,title=$2,description=$3,technique=$4,width=$5,height=$6,price=$7,image=$8,credit=$9,source_url=$10 WHERE id=$11`,
      [category,title,description,technique,width,height,Number(price)*100,`/art/art-${i+1}.jpg`,credit,sourceUrl,`sample-${i+1}`]);
  }
}
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
    for (let i=0;i<samplePieces.length;i++) {
      const [title,category,price,technique,width,height,description] = samplePieces[i];
      const [credit,sourceUrl] = sampleCredits[i];
      await tx.query(`INSERT INTO art.artworks(id,artist_id,category_id,title,description,technique,width,height,price,image,status,credit,source_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [`sample-${i+1}`,i%2?'demo-artist2':'demo-artist',category,title,description,technique,width,height,Number(price)*100,`/art/art-${i+1}.jpg`,i===7?'pending':'approved',credit,sourceUrl] );
    }
  });
}
