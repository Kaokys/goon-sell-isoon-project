
'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { reportUX } from '@/lib/ux-metrics';
export default function ErrorPage({error,retry}:{error:Error&{digest?:string},retry:()=>void}){useEffect(()=>{reportUX('runtime_error',0,error.digest||error.name);},[error]);return <main className="fallback-page"><h1>เปิดหน้านี้ไม่สำเร็จ</h1><p>ข้อมูลที่กรอกอาจยังอยู่ ลองเปิดหน้านี้อีกครั้ง</p><div className="profile-actions"><button className="button primary" onClick={retry}>ลองอีกครั้ง</button><Link className="button" href="/">กลับหน้าแรก</Link></div></main>;}
