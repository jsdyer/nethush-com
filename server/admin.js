import {SOURCES} from '../public/assets/catalog.js';
import {HEADERS,collectSource} from './service.js';
import {DEFAULT_SETTINGS,PAGE_IDS} from './store.js';
export function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...HEADERS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow',...extra}});}
export async function readJson(request,max=4096){
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))throw new Error('JSON required.');
 if(Number(request.headers.get('Content-Length'))>max)throw new Error('Request too large.');
 const reader=request.body?.getReader();if(!reader)throw new Error('Empty request.');const chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new Error('Request too large.');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export function sameOrigin(request,origin){return request.headers.get('Origin')===origin && !['cross-site','none'].includes(request.headers.get('Sec-Fetch-Site'));}
export function platformAuth(request,email){const actual=request.headers.get('oai-authenticated-user-email');return {authenticated:!!email&&!!request.headers.get('oai-authenticated-user-id')&&actual?.toLowerCase()===email.toLowerCase(),mode:'platform',csrf:'platform-origin'};}
export function optedOut(request){return request.headers.get('Sec-GPC')==='1'||request.headers.get('DNT')==='1';}
export function publicHtml(body,settings){const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');return body.replace('<body>','<body data-counting="'+(settings.metricsEnabled?'on':'off')+'">').replace('id="reader-heading">The quiet feed.', ()=> 'id="reader-heading">'+escape(settings.heading)).replace('Real publisher feeds. No ads, tracking scripts or pop-ups.</p>',()=>escape(settings.tagline)+'</p>').replace('<!-- operator-announcement -->',()=>settings.announcement?'<p class="notice operator-announcement">'+escape(settings.announcement)+'</p>':'');}
export async function adminApi(request,context){
 const {store,auth,origin,cache,fetcher}=context;const url=new URL(request.url);
 if(url.search && !['/api/admin/dashboard','/api/admin/export'].includes(url.pathname))return json({error:'Unexpected query.'},400);
 if(url.pathname==='/api/admin/session'&&request.method==='GET')return json({authenticated:auth.authenticated,mode:auth.mode,csrf:auth.authenticated?auth.csrf:null});
 if(!auth.authenticated)return json({error:'Administrator access required.'},401);
 if(!store)return json({error:'Persistent storage is unavailable.'},503);
 if(request.method==='POST'&&(!sameOrigin(request,origin)||request.headers.get('X-NetHush-CSRF')!==auth.csrf))return json({error:'Reload the admin page before changing settings.'},403);
 try{
  if(['/api/admin/dashboard','/api/admin/export'].includes(url.pathname)&&request.method==='GET'){
   if([...url.searchParams.keys()].some(x=>x!=='days')||url.searchParams.getAll('days').length>1)return json({error:'Invalid range.'},400);
   const days=Number(url.searchParams.get('days')||30);if(![7,30,90,365].includes(days))return json({error:'Invalid range.'},400);
   const data=await store.snapshot(days);data.mode=auth.mode;
   if(url.pathname.endsWith('/export'))return json({version:1,generatedAt:data.generatedAt,days:data.days,counts:data.counts},200,{'Content-Disposition':'attachment; filename="nethush-aggregate-stats.json"'});
   return json(data);
  }
  if(url.pathname==='/api/admin/settings'&&request.method==='POST'){
   const body=await readJson(request);if(!Number.isInteger(body.revision)||body.revision<0||Object.keys(body).sort().join(',')!=='revision,settings')return json({error:'Invalid settings request.'},400);
   try{return json({settings:await store.saveSettings(body.settings,body.revision)});}catch(error){return json({error:error.message},error.message.includes('another tab')?409:400);}
  }
  if(url.pathname==='/api/admin/refresh'&&request.method==='POST'){
   const body=await readJson(request,128);if(Object.keys(body).length!==0)return json({error:'No input expected.'},400);
   if(!await store.gate('feed-refresh',1,60000))return json({error:'Wait one minute between forced refreshes.'},429);
   const settings=await store.settings();await Promise.all(SOURCES.filter(s=>settings.enabledSources.includes(s.id)).map(s=>collectSource(s,cache,fetcher,Date.now(),{force:true,onResult:context.onFeed,cacheMinutes:settings.cacheMinutes})));
   await store.audit('feeds.refreshed');return json({ok:true});
  }
  if(url.pathname==='/api/admin/purge'&&request.method==='POST'){
   const body=await readJson(request,128);if(body.confirm!=='DELETE' || Object.keys(body).length!==1)return json({error:'Type DELETE to confirm.'},400);
   await store.purge();return json({ok:true});
  }
  return json({error:'Not found.'},404);
 }catch{return json({error:'The admin operation could not complete. Check database availability.'},503);}
}
export async function countPage(request,store,settings,origin){
 if(request.method!=='POST')return json({error:'POST required.'},405);
 if(!sameOrigin(request,origin)||new URL(request.url).search)return json({error:'Same-origin requests only.'},403);
 try{
  const body=await readJson(request,128);if(Object.keys(body).length!==1||!PAGE_IDS.includes(body.page))return json({error:'Unknown counter.'},400);
  if(store&&settings.metricsEnabled&&!optedOut(request)){
   // A global cap bounds write amplification without identifying individual visitors.
   if(await store.gate('page-counts',600,60000))await store.increment({['page.'+body.page]:1});
  }
  return new Response(null,{status:204,headers:{...HEADERS,'Cache-Control':'no-store'}});
 }catch{return json({error:'Counter not accepted.'},400);}
}
