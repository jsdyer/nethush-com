import {handle,HEADERS} from './service.js';
import {DEFAULT_SETTINGS,dayKey} from './store.js';
import {json,adminApi,countPage,publicHtml,optedOut} from './admin.js';
const swept=new WeakMap();
export async function application(request,{assets,cache,store,identify,authEndpoint,origin,fetcher=fetch}){
 const url=new URL(request.url);const started=Date.now();let metricSettings;
 try{
  if(url.pathname.startsWith('/api/admin/')){
   const auth=await identify(request);const special=authEndpoint?await authEndpoint(request):null;if(special)return special;
   const onFeed=await observer(store);
   return await adminApi(request,{store,auth,origin,cache,fetcher,onFeed});
  }
  if(url.pathname==='/admin'||url.pathname==='/admin/'){
   if(!['GET','HEAD'].includes(request.method))return json({error:'GET required.'},405);
   return new Response(request.method==='HEAD'?null:assets['/admin/index.html'].body,{headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }
  let settings;try{settings=store?await store.settings():DEFAULT_SETTINGS;}catch{settings={...DEFAULT_SETTINGS,metricsEnabled:false};}
  if(store&&swept.get(store)!==dayKey())try{await store.prune(settings.retentionDays);swept.set(store,dayKey());}catch{}
  metricSettings=settings;
  if(url.pathname==='/api/count')return countPage(request,store,settings,origin);
  let response;
  if((url.pathname==='/'||url.pathname==='/index.html')&&['GET','HEAD'].includes(request.method))response=new Response(request.method==='HEAD'?null:publicHtml(assets['/index.html'].body,settings),{headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  else response=await handle(request,assets,cache,fetcher,{enabledSources:settings.enabledSources,cacheMinutes:settings.cacheMinutes,onResult:await observer(store,settings)});
  // No request object or headers cross into the aggregate store. Only enum keys and numbers.
  if(store&&settings.metricsEnabled&&!optedOut(request)&&request.method==='GET'&&!url.pathname.startsWith('/admin/')&&!url.pathname.startsWith('/assets/')){
   const entries={};if(url.pathname==='/'||url.pathname==='/index.html')entries['http.page']=1;
   if(url.pathname==='/api/edition')entries['http.edition']=1;
   if(response.status>=500)entries['http.error']=1;if(response.status===404)entries['http.not_found']=1;
   if(entries['http.page']||entries['http.edition'])entries['http.latency.'+(Date.now()-started<50?'fast':Date.now()-started<250?'normal':Date.now()-started<1000?'slow':'very_slow')]=1;
   try{await store.increment(entries);}catch{} // Measurements must not stop public reading.
  }
  return response;
 }catch{if(store&&metricSettings?.metricsEnabled&&!optedOut(request)&&request.method==='GET')try{await store.increment({'http.error':1});}catch{}return json({error:'Service temporarily unavailable.'},503);}
}
async function observer(store,settings){
 if(!store)return undefined;
 if(!settings)settings=await store.settings();
 return async(source,feed,{cached,duration,bytes})=>{
  try{
   if(!cached)await store.health(source.id,feed,duration,bytes);
   if(settings.metricsEnabled)await store.increment(cached?{'feed.hit':1}:{'feed.fetch':1,'feed.failure':feed.error?1:0,'feed.bytes':bytes});
  }catch{} // Never forward errors containing remote data or persist publisher error bodies.
 };
}
