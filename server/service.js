import {SOURCES} from '../public/assets/catalog.js';
export const MAX_FEED_BYTES=1_500_000;
export const FRESH_MS=20*60*1000;
const flights=new Map();
export const HEADERS={
 'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
 'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()'
};
export async function limitedText(response,limit=MAX_FEED_BYTES){
 if(Number(response.headers.get('content-length'))>limit) { await response.body?.cancel(); throw new Error('Feed too large'); }
 if(!response.body) throw new Error('Empty feed');
 const reader=response.body.getReader();const parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw new Error('Feed too large');parts.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let p=0;for(const part of parts){bytes.set(part,p);p+=part.length;}
 const text=new TextDecoder().decode(bytes);
 if(/<!DOCTYPE|<!ENTITY/i.test(text)||!/<(?:rss|feed|rdf:RDF)\b/i.test(text))throw new Error('Unsupported feed');
 return text;
}
export async function collectSource(source,cache,fetcher=fetch,now=Date.now()){
 const key=new Request('https://nethush-cache.invalid/feed/'+source.id);
 let old;try{const hit=await cache.match(key);if(hit)old=await hit.json();}catch{}
 if(old && now-Date.parse(old.checkedAt||old.fetchedAt)<FRESH_MS)return old;
 try{
  // Fixed HTTPS URLs only; redirects are refused rather than following into other hosts.
  const response=await fetcher(source.url,{redirect:'manual',signal:AbortSignal.timeout(9000),headers:{'Accept':'application/atom+xml, application/rss+xml, application/xml, text/xml','User-Agent':'netHUSH-Reader/2.0 (+https://nethush.com)'},credentials:'omit'});
  if(!response.ok)throw new Error('Upstream unavailable');
  const xml=await limitedText(response);
  const data={id:source.id,xml,fetchedAt:new Date(now).toISOString(),checkedAt:new Date(now).toISOString(),stale:false,error:null};
  try{await cache.put(key,new Response(JSON.stringify(data),{headers:{'Cache-Control':'public, max-age=604800','Content-Type':'application/json'}}));}catch{}
  return data;
 }catch{
  const failure=old?.xml && now-Date.parse(old.fetchedAt)<7*86400000 ? {...old,stale:true,error:'Refresh failed; showing an older cached feed.'} : {id:source.id,xml:null,fetchedAt:null,stale:false,error:'Source unavailable. Try later or visit the publisher.'};
  failure.checkedAt=new Date(now).toISOString();
  try{await cache.put(key,new Response(JSON.stringify(failure),{headers:{'Cache-Control':'public, max-age=604800','Content-Type':'application/json'}}));}catch{}
  return failure;
 }
}
export async function edition(cache,fetcher=fetch){
 // Shared cache and fixed catalogue: selections and reading activity never reach this API.
 if(flights.has(cache))return flights.get(cache);
 const work=Promise.all(SOURCES.map(source=>collectSource(source,cache,fetcher))).then(feeds=>({version:1,checkedAt:new Date().toISOString(),feeds}));
 flights.set(cache,work);try{return await work;}finally{flights.delete(cache);}
}
export async function handle(request,assets,cache,fetcher=fetch){
 const url=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...HEADERS,Allow:'GET, HEAD'}});
 if(url.pathname==='/api/edition'){
  if(url.search)return new Response('Query parameters are not supported',{status:400,headers:HEADERS});
  const data=await edition(cache,fetcher);
  return new Response(request.method==='HEAD'?null:JSON.stringify(data),{headers:{...HEADERS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, max-age=60'}});
 }
 const path=url.pathname==='/'?'/index.html':url.pathname;
 const asset=assets[path];if(!asset)return new Response('Not found',{status:404,headers:HEADERS});
 return new Response(request.method==='HEAD'?null:asset.body,{headers:{...HEADERS,'Content-Type':asset.type,'Cache-Control':'no-cache'}});
}
