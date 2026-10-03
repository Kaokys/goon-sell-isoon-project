'use client';
import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { X, ChevronLeft, ChevronRight, LoaderCircle, ImagePlus, Check } from 'lucide-react';
export type Item=Record<string,any>;
export const money=(n:number|string)=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:2}).format(Number(n)/100);
export const date=(d:string)=>new Date(d).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});
export const statusNames:Item={approved:'พร้อมจำหน่าย',pending:'รออนุมัติ',rejected:'ต้องแก้ไข',reserved:'ถูกจองแล้ว',sold:'ขายแล้ว',pending_payment:'รอชำระเงิน',paid:'ชำระแล้ว',shipped:'จัดส่งแล้ว',completed:'สำเร็จ',cancelled:'ยกเลิก'};
export async function api(path:string,options?:RequestInit){const res=await fetch(`/api/${path}`,{...options,headers:options?.body instanceof FormData?options.headers:{'Content-Type':'application/json',...options?.headers}});const raw=await res.text();let data:any={};try{data=raw?JSON.parse(raw):{};}catch{data={};}if(!res.ok){const message=data.error||(res.status===413?'ไฟล์หรือข้อมูลมีขนาดใหญ่เกินไป กรุณาเลือกไฟล์ที่เล็กลง':res.status>=500?'ระบบไม่พร้อมใช้งานชั่วคราว กรุณาลองอีกครั้ง':'ดำเนินการไม่สำเร็จ กรุณาตรวจสอบข้อมูล');const error=new Error(message) as Error&{status?:number};error.status=res.status;throw error;}if(raw&&!Object.keys(data).length)throw new Error('ระบบตอบกลับไม่ถูกต้อง กรุณาลองอีกครั้ง');return data;}
export const send=async(path:string,data:any,method='POST')=>{const result=await api(path,{method,body:JSON.stringify(data)});clearPublicCache();return result;};
// Cache public lists only. Account, orders and management data always load afresh.
const publicCache=new Map<string,{data:any,time:number}>();
const publicRequests=new Map<string,Promise<any>>();
let cacheGeneration=0;
const isPublicList=(path:string)=>['categories','artists','site_settings'].includes(path)||path.startsWith('artworks?')&&!new URLSearchParams(path.split('?')[1]).has('manage');
const cachedData=(path:string)=>{const entry=publicCache.get(path);return entry&&Date.now()-entry.time<30000?entry.data:null;};
function clearPublicCache(){cacheGeneration++;publicCache.clear();publicRequests.clear();}
function loadData(path:string){
 if(!isPublicList(path))return api(path);
 const pending=publicRequests.get(path);if(pending)return pending;
 const generation=cacheGeneration;
 const request=api(path).then(data=>{if(generation===cacheGeneration){publicCache.set(path,{data,time:Date.now()});if(publicCache.size>50)publicCache.delete(publicCache.keys().next().value!);}return data;}).finally(()=>{if(publicRequests.get(path)===request)publicRequests.delete(path);});
 publicRequests.set(path,request);return request;
}
export function useData(path:string){
 const [state,setState]=useState<{path:string,data:any}>(()=>({path,data:isPublicList(path)?cachedData(path):null}));const [error,setError]=useState('');const [version,setVersion]=useState(0);
 const data=state.path===path?state.data:isPublicList(path)?cachedData(path):null;
 useEffect(()=>{let live=true;let timer:ReturnType<typeof setTimeout>;setError('');setState(current=>({path,data:current.path===path?current.data:isPublicList(path)?cachedData(path):null}));
 const load=(attempt=0)=>loadData(path).then(value=>{if(live)setState({path,data:value});}).catch((e:Error&{status?:number})=>{if(!live)return;if(attempt<2&&(!e.status||e.status>=500)){timer=setTimeout(()=>load(attempt+1),500*(attempt+1));return;}setError(e.message);});load();return()=>{live=false;clearTimeout(timer);};},[path,version]);
 return {data,error,reload:()=>setVersion(v=>v+1)};
}
export const AppContext=createContext<any>(null);
export function AppProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<any>(null);const [sessionError,setSessionError]=useState('');const [cart,setCart]=useState<string[]>([]);const [ready,setReady]=useState(false);const [toast,setToast]=useState('');const sessionRequest=useRef(0);
 const refreshSession=useCallback(async()=>{const request=++sessionRequest.current;try{const data=await api('session',{cache:'no-store'});if(request===sessionRequest.current){setSession(data);setSessionError('');}return data;}catch(e:any){if(request===sessionRequest.current)setSessionError(e.message);return null;}},[]);
 useEffect(()=>{refreshSession();try{const stored=JSON.parse(localStorage.getItem('sillapa-cart')||'[]');if(Array.isArray(stored))setCart(stored.filter(v=>typeof v==='string').slice(0,20));}catch{}setReady(true);},[refreshSession]);
 useEffect(()=>{if(ready)localStorage.setItem('sillapa-cart',JSON.stringify(cart));},[cart,ready]);
 useEffect(()=>{if(toast){const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer);}},[toast]);
 const logout=async()=>{await send('auth/logout',{});sessionRequest.current++;setSession((current:any)=>({...current,user:null}));setSessionError('');};
 const addToCart=(id:string)=>{setCart(current=>current.includes(id)?current:[...current,id]);setToast('เพิ่มผลงานในตะกร้าแล้ว');};
 return <AppContext.Provider value={{user:session?.user,session,sessionError,cart,setCart,addToCart,notify:setToast,refreshSession,logout}}>{children}{toast&&<div className="toast" role="status"><Check size={19}/>{toast}</div>}</AppContext.Provider>;
}
export const useApp=()=>useContext(AppContext);
export function Badge({status}:{status:string}){return <span className={`badge ${status}`}>{statusNames[status]||status}</span>;}
export function Loading(){return <div className="loading" role="status"><LoaderCircle className="spin" size={22}/> กำลังโหลดข้อมูล…</div>;}
export function ErrorBox({text}:{text:string}){return text?<p className="error" role="alert">{text}</p>:null;}
export function Empty({title='ยังไม่มีรายการ',children}:{title?:string,children?:ReactNode}){return <div className="empty"><div className="empty-symbol">✳</div><h3>{title}</h3>{children}</div>;}
export function Pagination({data,page,onChange}:{data:any,page:number,onChange:(page:number)=>void}){return data?.pages>1?<div className="pagination"><button className="icon-button" aria-label="หน้าก่อนหน้า" disabled={page<=1} onClick={()=>onChange(page-1)}><ChevronLeft size={18}/></button><span>หน้า {page} จาก {data.pages}</span><button className="icon-button" aria-label="หน้าถัดไป" disabled={page>=data.pages} onClick={()=>onChange(page+1)}><ChevronRight size={18}/></button></div>:null;}
export function Modal({title,children,onClose}:{title:string,children:ReactNode,onClose:()=>void}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();const dialog=ref.current;return()=>dialog?.close();},[]);return <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-head"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="ปิดหน้าต่าง" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;}
export function Upload({kind,onUploaded}:{kind:'art'|'slip'|'profile'|'banner',onUploaded:(data:any)=>void}){const [busy,setBusy]=useState(false);const [error,setError]=useState('');return <div><label className={`upload ${busy?'disabled':''}`}><ImagePlus size={24}/><strong>{busy?'กำลังอัปโหลด…':kind==='banner'?'เลือกภาพโปสเตอร์':kind==='art'?'เลือกภาพผลงาน':kind==='profile'?'เลือกภาพโปรไฟล์':'เลือกภาพสลิปการชำระเงิน'}</strong><span>JPG, PNG หรือ WebP · ไม่เกิน 3 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);setError('');try{const form=new FormData();form.set('file',file);form.set('kind',kind);const data=await api('upload',{method:'POST',body:form});onUploaded(data);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}/></label><ErrorBox text={error}/></div>;}
