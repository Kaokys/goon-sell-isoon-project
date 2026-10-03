
'use client';
export default function GlobalError({retry}:{error:Error&{digest?:string},retry:()=>void}){return <html lang="th"><body style={{fontFamily:'system-ui,sans-serif',padding:40,lineHeight:1.7}}><main><h1>เว็บไม่พร้อมใช้งานชั่วคราว</h1><p>ลองอีกครั้ง ข้อมูลในตะกร้ายังคงเก็บอยู่ในเบราว์เซอร์</p><button onClick={retry} style={{padding:'12px 24px'}}>ลองอีกครั้ง</button> <a href="/">กลับหน้าแรก</a></main></body></html>;}
