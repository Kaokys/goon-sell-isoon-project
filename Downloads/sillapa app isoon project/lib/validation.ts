import { z } from 'zod';
const text = (min: number,max: number) => z.string().trim().min(min,`กรุณากรอกอย่างน้อย ${min} ตัวอักษร`).max(max,`ต้องไม่เกิน ${max} ตัวอักษร`);
export const loginSchema = z.object({email:z.email('อีเมลไม่ถูกต้อง').trim().toLowerCase(),password:z.string().min(1).max(128)});
export const registerSchema = loginSchema.extend({name:text(2,100),password:z.string().min(10,'รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร').max(128),artist_requested:z.boolean().default(false)});
export const artworkSchema = z.object({title:text(2,150),description:text(10,3000),category_id:text(1,100),technique:text(2,100),width:z.coerce.number().positive().max(1000),height:z.coerce.number().positive().max(1000),price:z.coerce.number().positive().max(1000000).refine(v=>Math.abs(v*100-Math.round(v*100))<0.000001,'ราคาใส่ทศนิยมได้ไม่เกิน 2 ตำแหน่ง'),image:z.string().regex(/^\/api\/media\/[a-f0-9-]{36}$|^\/art\/art-[1-8]\.jpg$/,'กรุณาอัปโหลดภาพผลงาน')});
export const orderSchema = z.object({artwork_ids:z.array(text(1,100)).min(1).max(20).refine(v=>new Set(v).size===v.length,'ผลงานซ้ำในตะกร้า'),recipient:text(2,100),phone:z.string().regex(/^0\d{8,9}$/,'เบอร์โทรศัพท์ไม่ถูกต้อง'),address:text(15,600),idempotency_key:z.uuid()});
export const profileSchema = z.object({name:text(2,100),bio:text(0,1000),university:text(0,150),artist_requested:z.boolean().optional()});
export const userSchema = z.object({name:text(2,100),role:z.enum(['admin','staff','customer']),active:z.boolean()});
