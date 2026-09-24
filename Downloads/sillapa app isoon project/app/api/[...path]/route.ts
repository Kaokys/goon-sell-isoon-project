import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import { ZodError, z } from 'zod';
import { getDB, audit, type DB } from '@/lib/db';
import { AppError, sessionUser, requireUser, publicUser, createSession, digest, rateLimit, checkOrigin } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { loginSchema, registerSchema, artworkSchema, orderSchema, profileSchema, userSchema } from '@/lib/validation';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (data: any,status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function body(req: Request) { if (Number(req.headers.get('content-length')||0)>40000) throw new AppError(413,'ข้อมูลมีขนาดใหญ่เกินไป'); const raw=await req.text();if(raw.length>40000)throw new AppError(413,'ข้อมูลมีขนาดใหญ่เกินไป');try{return JSON.parse(raw);}catch{throw new AppError(400,'ข้อมูล JSON ไม่ถูกต้อง');} }
const pageArgs = (url: URL) => ({page: Math.max(1,Math.min(10000,Math.floor(Number(url.searchParams.get('page'))||1))),size:12});
async function mediaOwned(db: DB, image: string, user: any, previous?: string) {
  if (image===previous) return;
  if (!image.startsWith('/api/media/')) throw new AppError(400,'กรุณาอัปโหลดภาพผลงานของคุณเอง');
  const [file] = await db.query('SELECT id FROM art.media WHERE id=$1 AND owner_id=$2 AND kind=$3',[image.split('/').pop(),user.id,'art']);
  if (!file) throw new AppError(400,'ภาพไม่ถูกต้อง');
}
async function handle(req: Request, context: {params:Promise<{path:string[]}>}) {
  try {
    const {path} = await context.params;
    const [resource,id,action] = path;
    const method = req.method;
    const url = new URL(req.url);
    if (method!=='GET') checkOrigin(req);
    const methods:Record<string,string[]>= {session:['GET'],auth:['POST'],profile:['PATCH'],categories:['GET','POST','PATCH','DELETE'],artists:['GET'],artworks:['GET','POST','PATCH','DELETE'],upload:['POST'],media:['GET'],orders:['GET','POST','PATCH'],users:['GET','PATCH'],dashboard:['GET'],logs:['GET']};
    if(!methods[resource]?.includes(method))throw new AppError(405,'ไม่รองรับวิธีเรียกใช้งานนี้');
    const db = await getDB();

    if (resource==='session' && method==='GET') { const user=await sessionUser(); return json({user:user?publicUser(user):null,demo:!process.env.DATABASE_URL && !process.env.VERCEL,paymentConfigured:!!process.env.PROMPTPAY_ID}); }
    if (resource==='auth' && method==='POST') {
      if (id==='logout') { const token=(await cookies()).get('sillapa_session')?.value; if(token) await db.query('DELETE FROM art.sessions WHERE token_hash=$1',[digest(token)]); (await cookies()).delete('sillapa_session'); return json({ok:true}); }
      const data = (id==='register'?registerSchema:loginSchema).parse(await body(req));
      await rateLimit(db,`auth-ip:${req.headers.get('x-forwarded-for')?.split(',')[0]||'local'}`,100);
      await rateLimit(db,`auth-email:${data.email}`,12);
      if (id==='register') {
        const v=registerSchema.parse(data); const userId=randomUUID(); const hash=await hashPassword(v.password);
        await db.transaction(async tx=>{await tx.query('INSERT INTO art.users(id,email,password_hash,name,artist_requested) VALUES($1,$2,$3,$4,$5)',[userId,v.email,hash,v.name,v.artist_requested]);await audit(tx,userId,'register','user',userId);});
        await createSession(db,userId); return json({ok:true},201);
      }
      if (id==='login') {
        const [user] = await db.query('SELECT * FROM art.users WHERE email=$1',[data.email]);
        const valid = await verifyPassword(data.password,user?.password_hash || '00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
        if (!user || !valid || !user.active) throw new AppError(401,'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        await createSession(db,user.id); return json({user:publicUser(user)});
      }
    }
    if (resource==='profile' && method==='PATCH') {
      const user=await requireUser(); const v=profileSchema.parse(await body(req));
      await db.transaction(async tx=>{await tx.query('UPDATE art.users SET name=$1,bio=$2,university=$3,artist_requested=$4 WHERE id=$5',[v.name,v.bio,v.university,user.role==='customer'?!!v.artist_requested:false,user.id]);await audit(tx,user.id,'update_profile','user',user.id,{fields:['name','bio','university','artist_requested']});});
      return json({ok:true});
    }
    if (resource==='categories') {
      if(method==='GET') return json({items:await db.query('SELECT * FROM art.categories ORDER BY name')});
      const user=await requireUser(['admin']);
      if(method==='DELETE' && id) {await db.transaction(async tx=>{await tx.query('DELETE FROM art.categories WHERE id=$1',[id]);await audit(tx,user.id,'delete','category',id);});return json({ok:true});}
      const v=z.object({name:z.string().trim().min(2).max(60)}).parse(await body(req));
      const key=id||randomUUID();
      await db.transaction(async tx=>{if(method==='POST') await tx.query('INSERT INTO art.categories(id,name) VALUES($1,$2)',[key,v.name]);else await tx.query('UPDATE art.categories SET name=$1 WHERE id=$2',[v.name,key]);await audit(tx,user.id,method==='POST'?'create':'update','category',key,{name:v.name});});return json({ok:true});
    }
    if (resource==='artists' && method==='GET') {
      if(id) {const [artist]=await db.query(`SELECT id,name,bio,university FROM art.users WHERE id=$1 AND role IN ('staff','admin') AND active=true`,[id]);if(!artist)throw new AppError(404,'ไม่พบศิลปิน');return json({artist});}
      return json({items:await db.query(`SELECT u.id,u.name,u.bio,u.university,COUNT(a.id)::int AS count,MIN(a.image) AS image FROM art.users u LEFT JOIN art.artworks a ON a.artist_id=u.id AND a.status IN ('approved','sold','reserved') AND a.deleted=false WHERE u.active=true AND (u.role='staff' OR (u.role='admin' AND a.id IS NOT NULL)) GROUP BY u.id ORDER BY u.name`)});
    }
    if (resource==='artworks') {
      if(method==='GET') {
        const user=await sessionUser();
        if(id) {const [art]=await db.query(`SELECT a.*,u.name AS artist_name,u.bio AS artist_bio,u.university,c.name AS category_name FROM art.artworks a JOIN art.users u ON u.id=a.artist_id JOIN art.categories c ON c.id=a.category_id WHERE a.id=$1 AND a.deleted=false`,[id]);if(!art || (!['approved','reserved','sold'].includes(art.status) && user?.role!=='admin' && user?.id!==art.artist_id))throw new AppError(404,'ไม่พบผลงาน');return json({artwork:art});}
        const {page,size}=pageArgs(url); const values:any[]=[]; const conditions=['a.deleted=false'];
        const add=(sql:string,value:any)=>{values.push(value);conditions.push(sql.replace('?',`$${values.length}`));};
        if(url.searchParams.get('manage')==='true') {if(!user || !['staff','admin'].includes(user.role))throw new AppError(403,'ไม่มีสิทธิ์เข้าถึง');if(user.role==='staff')add('a.artist_id=?',user.id);}
        else conditions.push(`a.status IN ('approved','reserved','sold') AND u.active=true`);
        if(url.searchParams.get('q'))add(`(a.title ILIKE '%' || ? || '%' OR u.name ILIKE '%' || $${values.length+1} || '%')`,url.searchParams.get('q')!.slice(0,100));
        for(const [param,column] of [['category','category_id'],['artist','artist_id'],['status','status']])if(url.searchParams.get(param))add(`a.${column}=?`,url.searchParams.get(param));
        if(url.searchParams.get('max')){const n=Number(url.searchParams.get('max'));if(Number.isFinite(n)&&n>0)add('a.price<=?',Math.round(n*100));}
        const where=conditions.join(' AND ');const sort=({'price_asc':'a.price ASC','price_desc':'a.price DESC','oldest':'a.created_at ASC'} as any)[url.searchParams.get('sort')||'']||'a.created_at DESC';
        const [count]=await db.query(`SELECT COUNT(*)::int AS total FROM art.artworks a JOIN art.users u ON u.id=a.artist_id WHERE ${where}`,values);
        const items=await db.query(`SELECT a.*,u.name AS artist_name,c.name AS category_name FROM art.artworks a JOIN art.users u ON u.id=a.artist_id JOIN art.categories c ON c.id=a.category_id WHERE ${where} ORDER BY ${sort},a.id LIMIT ${size} OFFSET ${(page-1)*size}`,values);
        return json({items,total:count.total,page,pages:Math.ceil(count.total/size)});
      }
      const user=await requireUser(['staff','admin']);
      if(method==='POST' && !id) {
        const v=artworkSchema.parse(await body(req));await mediaOwned(db,v.image,user); const key=randomUUID();
        await db.transaction(async tx=>{await tx.query(`INSERT INTO art.artworks(id,artist_id,category_id,title,description,technique,width,height,price,image) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[key,user.id,v.category_id,v.title,v.description,v.technique,v.width,v.height,Math.round(v.price*100),v.image]);await audit(tx,user.id,'create','artwork',key,{title:v.title});});return json({id:key},201);
      }
      return await db.transaction(async tx=>{
        const [art]=await tx.query('SELECT * FROM art.artworks WHERE id=$1 AND deleted=false FOR UPDATE',[id]);
        if(!art)throw new AppError(404,'ไม่พบผลงาน');if(user.role!=='admin' && art.artist_id!==user.id)throw new AppError(403,'แก้ไขได้เฉพาะผลงานของคุณ');
        if(['sold','reserved'].includes(art.status))throw new AppError(409,'ผลงานนี้อยู่ในคำสั่งซื้อแล้ว ไม่สามารถแก้ไขหรือลบได้');
        if(method==='DELETE'){await tx.query('UPDATE art.artworks SET deleted=true,updated_at=now() WHERE id=$1',[id]);await audit(tx,user.id,'delete','artwork',id,{title:art.title});return json({ok:true});}
        if(action==='review') {
          if(user.role!=='admin')throw new AppError(403,'เฉพาะแอดมินเท่านั้น');
          const v=z.object({status:z.enum(['approved','rejected']),note:z.string().trim().max(500).default('')}).parse(await body(req));
          if(v.status==='rejected'&&!v.note)throw new AppError(400,'กรุณาระบุสิ่งที่ศิลปินต้องแก้ไข');
          await tx.query('UPDATE art.artworks SET status=$1,review_note=$2,updated_at=now() WHERE id=$3',[v.status,v.note,id]);await audit(tx,user.id,'review','artwork',id,{before:art.status,after:v.status,note:v.note});return json({ok:true});
        }
        const v=artworkSchema.parse(await body(req));await mediaOwned(tx,v.image,user,art.image);
        await tx.query(`UPDATE art.artworks SET title=$1,description=$2,category_id=$3,technique=$4,width=$5,height=$6,price=$7,image=$8,status='pending',review_note='',updated_at=now() WHERE id=$9`,[v.title,v.description,v.category_id,v.technique,v.width,v.height,Math.round(v.price*100),v.image,id]);
        await audit(tx,user.id,'update','artwork',id,{before:{title:art.title,price:art.price,status:art.status},after:{title:v.title,price:Math.round(v.price*100),status:'pending'}});return json({ok:true});
      });
    }
    if(resource==='upload' && method==='POST') {
      const user=await requireUser(); await rateLimit(db,`upload:${user.id}`,40);
      if(Number(req.headers.get('content-length')||0)>4*1024*1024)throw new AppError(413,'ไฟล์ต้องมีขนาดไม่เกิน 3 MB');
      const form=await req.formData();const file=form.get('file');const kind=form.get('kind');
      if(!(file instanceof File) || file.size>3*1024*1024 || file.size===0 || !['image/jpeg','image/png','image/webp'].includes(file.type))throw new AppError(400,'รองรับ JPG, PNG, WebP ขนาดไม่เกิน 3 MB');
      if(!['art','slip'].includes(String(kind)))throw new AppError(400,'ชนิดไฟล์ไม่ถูกต้อง');
      if(kind==='art' && !['staff','admin'].includes(user.role))throw new AppError(403,'เฉพาะศิลปินเท่านั้น');
      let data:Buffer;try {data=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:25000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:88}).toBuffer();}catch{throw new AppError(400,'ไฟล์ภาพเสียหายหรือมีความละเอียดสูงเกินไป');}
      const key=randomUUID();await db.query('INSERT INTO art.media(id,owner_id,kind,data) VALUES($1,$2,$3,$4)',[key,user.id,kind,data]);return json({id:key,url:`/api/media/${key}`},201);
    }
    if(resource==='media' && method==='GET') {
      const user=await sessionUser();
      const [file]=await db.query(`SELECT m.*,EXISTS(SELECT 1 FROM art.artworks a WHERE a.image='/api/media/' || m.id AND a.deleted=false AND a.status IN ('approved','reserved','sold')) AS published FROM art.media m WHERE m.id=$1`,[id]);
      if(!file || !(user?.id===file.owner_id || user?.role==='admin' || (file.kind==='art' && file.published)))throw new AppError(404,'ไม่พบไฟล์');
      return new Response(new Uint8Array(file.data),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(resource==='orders') {
      const user=await requireUser();
      if(method==='POST' && !id) {
        const v=orderSchema.parse(await body(req)); await rateLimit(db,`checkout:${user.id}`,30);
        return await db.transaction(async tx=>{
          await tx.query('SELECT id FROM art.users WHERE id=$1 FOR UPDATE',[user.id]);
          const [existing]=await tx.query('SELECT id FROM art.orders WHERE customer_id=$1 AND idempotency_key=$2',[user.id,v.idempotency_key]);if(existing)return json({id:existing.id});
          const items=[];
          for(const key of [...v.artwork_ids].sort()) {const [art]=await tx.query('SELECT a.* FROM art.artworks a JOIN art.users u ON u.id=a.artist_id WHERE a.id=$1 AND a.deleted=false AND u.active=true FOR UPDATE OF a',[key]);if(!art || art.status!=='approved')throw new AppError(409,'มีผลงานที่ขายแล้วหรือถูกจอง กรุณาตรวจตะกร้าอีกครั้ง');if(art.artist_id===user.id)throw new AppError(400,'ไม่สามารถซื้อผลงานของตนเอง');items.push(art);}
          const key=randomUUID();const total=items.reduce((sum,a)=>sum+a.price,0);
          await tx.query('INSERT INTO art.orders(id,customer_id,total,recipient,phone,address,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7)',[key,user.id,total,v.recipient,v.phone,v.address,v.idempotency_key]);
          for(const art of items){await tx.query('INSERT INTO art.order_items(order_id,artwork_id,title,price,image,artist_id) VALUES($1,$2,$3,$4,$5,$6)',[key,art.id,art.title,art.price,art.image,art.artist_id]);await tx.query(`UPDATE art.artworks SET status='reserved',updated_at=now() WHERE id=$1`,[art.id]);}
          await audit(tx,user.id,'create','order',key,{total,items:items.map(a=>a.id)});return json({id:key},201);
        });
      }
      if(method==='GET') {
        const {page,size}=pageArgs(url);const values:any[]=[];let where='TRUE';
        if(user.role==='staff' && url.searchParams.get('sales')==='true') {const items=await db.query(`SELECT o.id,o.status,o.created_at,i.title,i.price FROM art.orders o JOIN art.order_items i ON i.order_id=o.id WHERE i.artist_id=$1 ORDER BY o.created_at DESC LIMIT 200`,[user.id]);return json({items});}
        if(user.role!=='admin' || url.searchParams.get('mine')==='true'){values.push(user.id);where='o.customer_id=$1';}
        if(id){values.push(id);where+=` AND o.id=$${values.length}`;}
        if(url.searchParams.get('status')){values.push(url.searchParams.get('status'));where+=` AND o.status=$${values.length}`;}
        const [count]=await db.query(`SELECT COUNT(*)::int AS total FROM art.orders o WHERE ${where}`,values);
        const orders=await db.query(`SELECT o.*,u.name AS customer_name FROM art.orders o JOIN art.users u ON u.id=o.customer_id WHERE ${where} ORDER BY o.created_at DESC LIMIT ${size} OFFSET ${(page-1)*size}`,values);
        for(const order of orders)order.items=await db.query('SELECT * FROM art.order_items WHERE order_id=$1',[order.id]);
        if(id){if(!orders[0])throw new AppError(404,'ไม่พบคำสั่งซื้อ');let qr=null;const pp=process.env.PROMPTPAY_ID;if(pp && /^(0\d{9}|\d{13})$/.test(pp))qr=await QRCode.toDataURL(generatePayload(pp,{amount:orders[0].total/100}),{width:360,margin:2});return json({order:orders[0],qr,paymentName:process.env.PROMPTPAY_NAME||'',paymentId:pp||'',demo:!process.env.DATABASE_URL});}
        return json({items:orders,total:count.total,page,pages:Math.ceil(count.total/size)});
      }
      return await db.transaction(async tx=>{
        const [order]=await tx.query('SELECT * FROM art.orders WHERE id=$1 FOR UPDATE',[id]);if(!order || (user.role!=='admin' && order.customer_id!==user.id))throw new AppError(404,'ไม่พบคำสั่งซื้อ');
        if(action==='slip') {
          if(order.status!=='pending_payment')throw new AppError(409,'คำสั่งซื้อนี้ไม่รอชำระเงินแล้ว');
          const v=z.object({slip_id:z.uuid()}).parse(await body(req));const [file]=await tx.query(`SELECT id FROM art.media WHERE id=$1 AND owner_id=$2 AND kind='slip'`,[v.slip_id,user.id]);if(!file)throw new AppError(400,'สลิปไม่ถูกต้อง');
          await tx.query(`UPDATE art.orders SET slip_id=$1,payment_note='',updated_at=now() WHERE id=$2`,[v.slip_id,id]);await audit(tx,user.id,'upload_slip','order',id);return json({ok:true});
        }
        const v=z.object({status:z.enum(['paid','shipped','completed','cancelled','reject_slip']),tracking:z.string().trim().max(150).default(''),note:z.string().trim().max(500).default('')}).parse(await body(req));
        const isAdmin=user.role==='admin';
        if(v.status==='reject_slip'){if(!isAdmin)throw new AppError(403,'เฉพาะแอดมิน');if(order.status!=='pending_payment'||!order.slip_id||!v.note)throw new AppError(400,'กรุณาระบุเหตุผลในการปฏิเสธสลิป');await tx.query('UPDATE art.orders SET slip_id=NULL,payment_note=$1,updated_at=now() WHERE id=$2',[v.note,id]);await audit(tx,user.id,'reject_slip','order',id,{note:v.note});return json({ok:true});}
        const allowed = (v.status==='cancelled' && order.status==='pending_payment' && (!order.slip_id || isAdmin)) || (v.status==='paid' && order.status==='pending_payment' && !!order.slip_id && isAdmin) || (v.status==='shipped' && order.status==='paid' && isAdmin && v.tracking.length>2) || (v.status==='completed' && order.status==='shipped' && (isAdmin || order.customer_id===user.id));
        if(!allowed)throw new AppError(409,'ไม่สามารถเปลี่ยนสถานะได้ ตรวจสอบสิทธิ์ สลิป และเลขพัสดุ');
        await tx.query('UPDATE art.orders SET status=$1,tracking=$2,updated_at=now() WHERE id=$3',[v.status,v.tracking||order.tracking,id]);
        if(v.status==='paid' || v.status==='cancelled')await tx.query('UPDATE art.artworks SET status=$1,updated_at=now() WHERE id IN (SELECT artwork_id FROM art.order_items WHERE order_id=$2)',[v.status==='paid'?'sold':'approved',id]);
        await audit(tx,user.id,'status_change','order',id,{before:order.status,after:v.status,tracking:v.tracking});return json({ok:true});
      });
    }
    if(resource==='users') {
      const user=await requireUser(['admin']);
      if(method==='GET') {const {page,size}=pageArgs(url);const q=(url.searchParams.get('q')||'').slice(0,100);const [count]=await db.query(`SELECT COUNT(*)::int AS total FROM art.users WHERE name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%'`,[q]);return json({items:await db.query(`SELECT id,name,email,role,active,artist_requested,created_at FROM art.users WHERE name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%' ORDER BY created_at DESC LIMIT ${size} OFFSET ${(page-1)*size}`,[q]),total:count.total,page,pages:Math.ceil(count.total/size)});}
      const v=userSchema.parse(await body(req));
      await db.transaction(async tx=>{await tx.query(`SELECT id FROM art.users WHERE role='admin' ORDER BY id FOR UPDATE`);const [target]=await tx.query('SELECT * FROM art.users WHERE id=$1 FOR UPDATE',[id]);if(!target)throw new AppError(404,'ไม่พบผู้ใช้');if(id===user.id && (v.role!=='admin'||!v.active))throw new AppError(400,'ไม่สามารถลดสิทธิ์หรือปิดใช้งานบัญชีตนเอง');await tx.query('UPDATE art.users SET name=$1,role=$2,active=$3,artist_requested=false WHERE id=$4',[v.name,v.role,v.active,id]);if(v.role!==target.role||!v.active)await tx.query('DELETE FROM art.sessions WHERE user_id=$1',[id]);await audit(tx,user.id,'update','user',id,{before:{role:target.role,active:target.active},after:{role:v.role,active:v.active}});});return json({ok:true});
    }
    if(resource==='dashboard' && method==='GET') {
      const user=await requireUser(['admin','staff']);const params=user.role==='staff'?[user.id]:[];const own=user.role==='staff'?' AND i.artist_id=$1':'';
      const [stats]=await db.query(`SELECT COALESCE(SUM(i.price) FILTER(WHERE o.status IN ('paid','shipped','completed')),0)::bigint AS revenue,COUNT(DISTINCT o.id) FILTER(WHERE o.status IN ('paid','shipped','completed'))::int AS orders FROM art.orders o JOIN art.order_items i ON i.order_id=o.id WHERE TRUE ${own}`,params);
      const [art]=await db.query(`SELECT COUNT(*)::int AS artworks,COUNT(*) FILTER(WHERE status='pending')::int AS pending FROM art.artworks WHERE deleted=false ${user.role==='staff'?'AND artist_id=$1':''}`,params);
      const monthly=await db.query(`SELECT to_char(o.created_at,'YYYY-MM') AS month,SUM(i.price)::bigint AS revenue FROM art.orders o JOIN art.order_items i ON i.order_id=o.id WHERE o.status IN ('paid','shipped','completed') ${own} GROUP BY month ORDER BY month DESC LIMIT 6`,params);
      const artists=await db.query(`SELECT u.name,COUNT(*)::int AS sold,SUM(i.price)::bigint AS revenue FROM art.order_items i JOIN art.orders o ON o.id=i.order_id JOIN art.users u ON u.id=i.artist_id WHERE o.status IN ('paid','shipped','completed') ${own} GROUP BY u.id,u.name ORDER BY revenue DESC`,params);
      return json({stats:{...stats,...art},monthly:monthly.reverse(),artists});
    }
    if(resource==='logs' && method==='GET') {await requireUser(['admin']);const {page,size}=pageArgs(url);const [count]=await db.query('SELECT COUNT(*)::int AS total FROM art.audit_logs');return json({items:await db.query(`SELECT l.*,u.name AS actor_name FROM art.audit_logs l LEFT JOIN art.users u ON u.id=l.actor_id ORDER BY l.id DESC LIMIT ${size} OFFSET ${(page-1)*size}`),total:count.total,page,pages:Math.ceil(count.total/size)});}
    throw new AppError(404,'ไม่พบรายการที่ต้องการ');
  } catch(error:any) {
    if(error instanceof AppError)return json({error:error.message},error.status);
    if(error instanceof ZodError)return json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(' · ')},400);
    if(error.code==='23505')return json({error:'ข้อมูลนี้มีอยู่แล้ว กรุณาตรวจสอบอีเมลหรือชื่อ'},409);
    if(error.code==='23503')return json({error:'รายการนี้ยังถูกใช้งานอยู่ หรือข้อมูลอ้างอิงไม่ถูกต้อง'},409);
    console.error('API error:',error.message);return json({error:'ระบบยังไม่พร้อม กรุณาลองใหม่ หรือตรวจสอบการตั้งค่าฐานข้อมูล'},500);
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
