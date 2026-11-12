import {SOURCES} from '../public/assets/catalog.js';
export const PAGE_IDS=['home','toolkit','cleaner','passwords','photos','inspector','checksum','browser','checklist','guides','directory','about','privacy'];
export const DEFAULT_SETTINGS=Object.freeze({heading:'The quiet feed.',tagline:'Real publisher feeds. No ads, tracking scripts or pop-ups.',announcement:'',metricsEnabled:true,retentionDays:90,cacheMinutes:20,enabledSources:SOURCES.map(s=>s.id)});
export const METRICS=new Set(['http.page','http.edition','http.error','http.not_found','http.latency.fast','http.latency.normal','http.latency.slow','http.latency.very_slow','feed.hit','feed.fetch','feed.failure','feed.bytes',...PAGE_IDS.map(x=>'page.'+x)]);
export const dayKey=(now=Date.now())=>new Date(now).toISOString().slice(0,10);
export const cutoffDay=(days,now=Date.now())=>dayKey(now-(days-1)*86400000);
export function validateSettings(value){
 if(!value||Object.keys(value).sort().join(',')!==Object.keys(DEFAULT_SETTINGS).sort().join(','))throw new Error('Unexpected settings fields.');
 const text=(key,max,required=false)=>{if(typeof value[key]!=='string'||value[key].length>max||/[\u0000-\u001f\u007f]/.test(value[key])||(required&&!value[key].trim()))throw new Error('Invalid '+key+'.');return value[key].trim();};
 if(typeof value.metricsEnabled!=='boolean'||!Number.isInteger(value.retentionDays)||value.retentionDays<7||value.retentionDays>365||!Number.isInteger(value.cacheMinutes)||value.cacheMinutes<5||value.cacheMinutes>120)throw new Error('Retention must be 7–365 days and cache duration 5–120 minutes.');
 if(!Array.isArray(value.enabledSources)||value.enabledSources.length>SOURCES.length||value.enabledSources.some(id=>!SOURCES.some(s=>s.id===id))||new Set(value.enabledSources).size!==value.enabledSources.length)throw new Error('Invalid source selection.');
 return {heading:text('heading',80,true),tagline:text('tagline',180,true),announcement:text('announcement',280),metricsEnabled:value.metricsEnabled,retentionDays:value.retentionDays,cacheMinutes:value.cacheMinutes,enabledSources:[...value.enabledSources]};
}
export class Store{
 constructor(db){this.db=db;}
 stmt(sql,args=[]){return this.db.prepare(sql).bind(...args);}
 async rows(sql,args=[]){return (await this.stmt(sql,args).all()).results;}
 async run(sql,args=[]){return this.stmt(sql,args).run();}
 async batch(statements){return this.db.batch(statements.map(([sql,args])=>this.stmt(sql,args)));}
 async settings(){const rows=await this.rows('SELECT revision, payload, updated_at FROM site_settings WHERE id=1');return rows.length?{revision:rows[0].revision,updatedAt:rows[0].updated_at,...validateSettings(JSON.parse(rows[0].payload))}:{revision:0,updatedAt:null,...DEFAULT_SETTINGS,enabledSources:[...DEFAULT_SETTINGS.enabledSources]};}
 async saveSettings(settings,revision,now=Date.now()){
  const clean=validateSettings(settings);const at=new Date(now).toISOString();
  const results=await this.batch([
   revision===0?['INSERT INTO site_settings(id,revision,payload,updated_at) VALUES(1,1,?,?) ON CONFLICT(id) DO NOTHING',[JSON.stringify(clean),at]]:['UPDATE site_settings SET revision=revision+1,payload=?,updated_at=? WHERE id=1 AND revision=?',[JSON.stringify(clean),at,revision]],
  ]);
  if(!results[0].meta.changes)throw new Error('Settings changed in another tab. Reload before saving.');
  await this.audit('settings.saved',now);await this.prune(clean.retentionDays,now);return this.settings();
 }
 async increment(entries,now=Date.now()){
  const pairs=Object.entries(entries);for(const [key,value] of pairs)if(!METRICS.has(key)||!Number.isSafeInteger(value)||value<0)throw new Error('Invalid aggregate.');
  if(pairs.length)await this.batch(pairs.map(([key,value])=>['INSERT INTO daily_counts(day,metric,value) VALUES(?,?,?) ON CONFLICT(day,metric) DO UPDATE SET value=value+excluded.value',[dayKey(now),key,value]]));
 }
 async audit(action,now=Date.now()){if(!['settings.saved','feeds.refreshed','metrics.purged','admin.login','admin.logout','admin.password_reset'].includes(action))throw new Error('Unknown action');await this.run('INSERT INTO admin_audit(happened_at,action) VALUES(?,?)',[new Date(now).toISOString(),action]);}
 async health(source,feed,duration,bytes){
  if(!SOURCES.some(s=>s.id===source))throw new Error('Unknown source');
  await this.run('INSERT INTO source_health(source,checked_at,fetched_at,state,duration_ms,bytes) VALUES(?,?,?,?,?,?) ON CONFLICT(source) DO UPDATE SET checked_at=excluded.checked_at,fetched_at=excluded.fetched_at,state=excluded.state,duration_ms=excluded.duration_ms,bytes=excluded.bytes',[source,feed.checkedAt,feed.fetchedAt,feed.error?(feed.stale?'stale':'failed'):'ok',Math.max(0,Math.round(duration)),bytes]);
 }
 async prune(days,now=Date.now()){
  await this.batch([
   ['DELETE FROM daily_counts WHERE day < ?',[cutoffDay(days,now)]],
   ['DELETE FROM admin_audit WHERE happened_at < ?',[new Date(now-90*86400000).toISOString()]],
   ['DELETE FROM admin_sessions WHERE expires_at <= ?',[now]],
   ['DELETE FROM action_limits WHERE expires_at <= ?',[now]]
  ]);
 }
 async snapshot(days=30,now=Date.now()){
  const settings=await this.settings();await this.prune(settings.retentionDays,now);
  const [counts,health,audit]=await Promise.all([this.rows('SELECT day,metric,value FROM daily_counts WHERE day >= ? ORDER BY day,metric',[cutoffDay(Math.min(days,settings.retentionDays),now)]),this.rows('SELECT * FROM source_health ORDER BY source'),this.rows('SELECT happened_at,action FROM admin_audit ORDER BY id DESC LIMIT 30')]);
  return {version:1,generatedAt:new Date(now).toISOString(),days:Math.min(days,settings.retentionDays),settings,counts,health,audit,sources:SOURCES};
 }
 async gate(name,limit,windowMs,now=Date.now()){
  const bucket=name+':'+Math.floor(now/windowMs);
  const results=await this.batch([['INSERT INTO action_limits(bucket,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts',[bucket,(Math.floor(now/windowMs)+1)*windowMs]]]);
  return results[0].results[0].attempts<=limit;
 }
 async purge(now=Date.now()){await this.batch([['DELETE FROM daily_counts',[]],['INSERT INTO admin_audit(happened_at,action) VALUES(?,?)',[new Date(now).toISOString(),'metrics.purged']]]);}
}
