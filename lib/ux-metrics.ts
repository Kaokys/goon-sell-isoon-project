let sent=0;
export function reportUX(type:string,value=0,code='',pathname?:string){
 if(typeof window==='undefined'||sent>=12)return;sent++;
 const allowed=new Set(['admin','studio','gallery','artists','artworks','orders','cart','profile','profiles','addresses','login','register','credits','users','categories','logs','poster']);
 const route='/'+(pathname||location.pathname).split('/').filter(Boolean).map(part=>allowed.has(part)?part:':id').join('/');
 const payload=JSON.stringify({type,value:Number.isFinite(value)?Math.max(0,value):0,route,code:code.slice(0,60)});
 const blob=new Blob([payload],{type:'application/json'});try{if(navigator.sendBeacon('/api/ux_metrics',blob))return;}catch{}void fetch('/api/ux_metrics',{method:'POST',body:payload,headers:{'Content-Type':'application/json'},keepalive:true}).catch(()=>{});
}
