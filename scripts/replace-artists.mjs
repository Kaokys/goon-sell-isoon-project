import fs from 'node:fs/promises';
const host=process.argv[2];
if(!host)throw Error('Usage: node scripts/replace-artists.mjs http://localhost:3102');
const password='ArtDemo2026!';
async function call(path,method='GET',data,cookie=''){
 const res=await fetch(host+'/api/'+path,{method,headers:{Origin:host,...(cookie?{cookie}:{}),...(data && !(data instanceof FormData)?{'Content-Type':'application/json'}:{})},body:data instanceof FormData?data:data?JSON.stringify(data):undefined});
 const raw=await res.text();let result;try{result=JSON.parse(raw);}catch{throw Error(path+': '+raw.slice(0,180));}
 if(!res.ok)throw Error(path+': '+JSON.stringify(result));return {data:result,cookie:res.headers.get('set-cookie')?.split(';')[0]||cookie};
}
const admin=(await call('auth/login','POST',{email:'admin@demo.local',password})).cookie;
const specs=[['benjamin.blue@demo.local','เบนจามินยาฮู','blue','#168bd2'],['benjamin.green@demo.local','เบนจามินเทนนอสัน','green','#36b52b']];
const users=(await call('users?size=100', 'GET',undefined,admin)).data.items;
for(const [email,name,color,accent] of specs){
 let user=users.find(u=>u.email===email);
 if(!user){await call('auth/register','POST',{email,name,password,artist_requested:true});user=(await call('users?size=100','GET',undefined,admin)).data.items.find(u=>u.email===email);}
 await call('users/'+user.id,'PATCH',{name,role:'staff',active:true},admin);
 const artist=(await call('auth/login','POST',{email,password})).cookie;
 async function upload(kind,cookie){const form=new FormData();form.set('kind',kind);form.set('file',new Blob([await fs.readFile('public/art/'+color+'.jpg')],{type:'image/jpeg'}),color+'.jpg');return (await call('upload','POST',form,cookie)).data.url;}
 const avatar=await upload('profile',artist);
 await call('profile','PATCH',{name,bio:'ศิลปินมีม'+(color==='blue'?'สีฟ้า':'สีเขียว')+' — บัญชีสำหรับโปรเจกต์สาธิต',university:'',avatar,cover:'',accent},artist);
 const existing=(await call('artworks?manage=true&size=100','GET',undefined,artist)).data.items;
 if(!existing.length){const image=await upload('art',artist);const created=(await call('artworks','POST',{title:name+' — พลัง'+(color==='blue'?'สีฟ้า':'สีเขียว'),description:'ภาพมีมที่ผู้ใช้แนบสำหรับโปรเจกต์สาธิต ของ '+name,category_id:'painting',technique:'ภาพดิจิทัล',width:60,height:90,price:3000,image},artist)).data;
 await call('artworks/'+created.id+'/review','PATCH',{status:'approved',note:'อนุมัติผลงานตามคำขอของเจ้าของโปรเจกต์'},admin);}
 if(color==='blue'){const image=await upload('banner',admin);await call('site_settings','PATCH',{image},admin);}
 console.log('Published:',name,email);
}
const keep=(await call('users?size=100','GET',undefined,admin)).data.items.filter(u=>specs.some(s=>s[0]===u.email)).map(u=>u.id);
const old=(await call('artworks?manage=true&size=100','GET',undefined,admin)).data.items.filter(a=>!keep.includes(a.artist_id));
for(const a of old){if(!['sold','reserved'].includes(a.status))await call('artworks/'+a.id,'DELETE',undefined,admin);}
for(const u of users.filter(u=>u.role==='staff'&&!keep.includes(u.id)))await call('users/'+u.id,'PATCH',{name:u.name,role:'staff',active:false},admin);
const artists=(await call('artists')).data.items;const gallery=(await call('artworks?size=100')).data;
if(artists.length!==2||gallery.total!==2)throw Error('Expected exactly 2 artists and 2 published artworks: '+JSON.stringify({artists:artists.length,artworks:gallery.total}));
for(const art of gallery.items){const image=await fetch(host+art.image);if(!image.ok)throw Error('Artwork image unavailable');}
console.log('Verified 2 artists, 2 approved works and public images:',host);
