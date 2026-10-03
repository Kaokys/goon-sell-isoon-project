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
const catalog=JSON.parse(await fs.readFile('public/art/attributions.json','utf8'));
async function listAll(resource,cookie=''){
 const items=[];for(let page=1;;page++){const result=(await call(resource+(resource.includes('?')?'&':'?')+'page='+page,'GET',undefined,cookie)).data;items.push(...result.items);if(page>=(result.pages||1))return items;}
}
const users=await listAll('users',admin);
const keep=[];
for(const [email,name,color,accent] of specs){
 let user=users.find(u=>u.email===email);
 if(!user){await call('auth/register','POST',{email,name,password,artist_requested:true});user=(await listAll('users',admin)).find(u=>u.email===email);}
 if(!user)throw Error('Artist account missing');
 keep.push(user.id);
 if(user.role!=='staff'||!user.active)await call('users/'+user.id,'PATCH',{name,role:'staff',active:true},admin);
 const artist=(await call('auth/login','POST',{email,password})).cookie;
 async function upload(kind,cookie,filename){const form=new FormData();form.set('kind',kind);form.set('file',new Blob([await fs.readFile('public/art/'+filename)],{type:'image/jpeg'}),filename);return (await call('upload','POST',form,cookie)).data.url;}
 const profile=(await call('profile','GET',undefined,artist)).data.profile;
 if(!profile.avatar){const avatar=await upload('profile',artist,color+'.jpg');await call('profile','PATCH',{name,bio:'ศิลปินมีม'+(color==='blue'?'สีฟ้า':'สีเขียว')+' — บัญชีสำหรับโปรเจกต์สาธิต',university:'',avatar,cover:'',accent},artist);}
 const existing=await listAll('artworks?manage=true',artist);
 for(const piece of catalog.filter(piece=>piece.color===color)){
  const previous=existing.find(a=>a.title===piece.title&&a.description.includes(piece.source_url));
  if(previous?.status==='approved'){console.log('Already approved:',piece.title);continue;}
  const image=await upload('art',artist,piece.filename);
  const created=(await call('artworks','POST',{title:piece.title,description:'ภาพนิ่งจาก GIF มีมบน Tenor ใช้เป็นผลงานสาธิตของ '+name+' — ต้นทาง: '+piece.source_url,category_id:'painting',technique:'ภาพมีมจาก GIF',width:60,height:60,price:3000,image},artist)).data;
  await call('artworks/'+created.id+'/review','PATCH',{status:'approved',note:'อนุมัติภาพมีมสาธิตจากอินเทอร์เน็ต'},admin);
  console.log('Published:',name,piece.title);
 }
 const expectedTitles=new Set(catalog.filter(piece=>piece.color===color).map(piece=>piece.title));
 for(const previous of existing.filter(a=>!expectedTitles.has(a.title))){if(['sold','reserved'].includes(previous.status))throw Error('Cannot remove artwork in an order: '+previous.title);await call('artworks/'+previous.id,'DELETE',undefined,admin);}
 if(profile.avatar&&(await call('profile','GET',undefined,artist)).data.profile.avatar!==profile.avatar)throw Error('Existing profile image changed');
}
const old=(await listAll('artworks?manage=true',admin)).filter(a=>!keep.includes(a.artist_id));
for(const a of old){if(!['sold','reserved'].includes(a.status))await call('artworks/'+a.id,'DELETE',undefined,admin);}
for(const u of users.filter(u=>u.role==='staff'&&!keep.includes(u.id)&&u.active))await call('users/'+u.id,'PATCH',{name:u.name,role:'staff',active:false},admin);
// The two supplied portraits are used only as artist avatars, not as the store poster.
await call('site_settings','PATCH',{image:'/art/art-1.jpg'},admin);
const artists=(await call('artists')).data.items;const gallery=await listAll('artworks');
if(artists.length!==2||gallery.length!==catalog.length)throw Error('Unexpected catalogue counts: '+JSON.stringify({artists:artists.length,artworks:gallery.length}));
for(const userId of keep)if(gallery.filter(a=>a.artist_id===userId).length!==catalog.filter(piece=>piece.color===(userId===keep[0]?'blue':'green')).length)throw Error('Artwork ownership is incorrect');
for(const art of gallery){if(art.status!=='approved')throw Error('Artwork is not approved');const image=await fetch(host+art.image);if(!image.ok||(await image.arrayBuffer()).byteLength===0)throw Error('Artwork image unavailable');}
console.log('Verified 2 artists, '+catalog.length+' approved internet memes, correct ownership and unchanged profile images:',host);
