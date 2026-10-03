import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDB, type DB } from './db';
export class AppError extends Error { constructor(public status: number, message: string) { super(message); } }
export const publicUser = (u: any) => ({id:u.id,email:u.email,name:u.name,role:u.role,bio:u.bio,university:u.university,artist_requested:u.artist_requested,avatar:u.avatar,cover:u.cover,accent:u.accent});
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
export const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export async function sessionUser() {
  const token = (await cookies()).get('sillapa_session')?.value;
  if (!token) return null;
  const db = await getDB();
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { get } = await import('@vercel/blob');
    const stored = await get(`sillapa/sessions/${digest(token)}.json`,{access:'private',useCache:false});
    if (!stored?.stream) return null;
    const session = JSON.parse(await new Response(stored.stream as any).text());
    if (session.expiresAt <= Date.now()) return null;
    const [user] = await db.query('SELECT * FROM art.users WHERE id=$1 AND active=true',[session.userId]);
    return user && user.role === session.role ? user : null;
  }
  return (await db.query(`SELECT u.* FROM art.sessions s JOIN art.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`,[digest(token)]))[0] || null;
}
export async function requireUser(roles?: string[]) {
  const user = await sessionUser();
  if (!user) throw new AppError(401,'กรุณาเข้าสู่ระบบ');
  if (roles && !roles.includes(user.role)) throw new AppError(403,'คุณไม่มีสิทธิ์ดำเนินการนี้');
  return user;
}
export async function createSession(db: DB, userId: string) {
  const token = randomBytes(32).toString('hex');
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const [user] = await db.query('SELECT role FROM art.users WHERE id=$1',[userId]);
    await put(`sillapa/sessions/${digest(token)}.json`,JSON.stringify({userId,role:user.role,expiresAt:Date.now()+SESSION_MAX_AGE*1000}),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:true});
  }
  await db.transaction(async tx=>{await tx.query(`DELETE FROM art.sessions WHERE expires_at<now()`);await tx.query(`INSERT INTO art.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+($3 * interval '1 second'))`,[digest(token),userId,SESSION_MAX_AGE]);});
  (await cookies()).set('sillapa_session',token,{httpOnly:true,secure:!!process.env.VERCEL || process.env.APP_URL?.startsWith('https://'),sameSite:'lax',path:'/',maxAge:SESSION_MAX_AGE});
}
export async function revokeSession(token: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import('@vercel/blob');
    await del(`sillapa/sessions/${digest(token)}.json`);
  }
}
export async function rateLimit(db: DB, key: string, limit=15) {
  const [row] = await db.query(`INSERT INTO art.rate_limits(key,hits,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN art.rate_limits.expires_at<now() THEN 1 ELSE art.rate_limits.hits+1 END, expires_at=CASE WHEN art.rate_limits.expires_at<now() THEN now()+interval '15 minutes' ELSE art.rate_limits.expires_at END RETURNING hits`,[digest(key)]);
  if (row.hits>limit) throw new AppError(429,'ทำรายการบ่อยเกินไป กรุณารอ 15 นาที');
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.APP_URL || new URL(request.url).origin;
  if (!origin || origin !== new URL(expected).origin) throw new AppError(403,'คำขอไม่ถูกต้อง กรุณาเปิดเว็บจากที่อยู่หลัก');
}
