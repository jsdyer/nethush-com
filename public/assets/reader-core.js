export function safeLink(value,base){try{const url=new URL(value,base);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;return url.href;}catch{return null;}}
export function plainText(value,max=650){
 const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
 // Treat markup as text; never instantiate publisher HTML in a live or detached HTML document.
 return String(value||'').slice(0,100000).replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,x)=>{
  if(x[0]!=='#')return entities[x.toLowerCase()]||' ';const n=x[1].toLowerCase()==='x'?parseInt(x.slice(2),16):Number(x.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):' ';
 }).replace(/\s+/g,' ').trim().slice(0,max);
}
export function parseFeed(xml,source,Parser=globalThis.DOMParser){
 if(typeof xml!=='string'||xml.length>1_500_000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Unsupported feed');
 const doc=new Parser().parseFromString(xml,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw new Error('Unreadable feed');
 const root=doc.documentElement.localName;
 if(!['rss','feed','RDF'].includes(root))throw new Error('Unsupported feed');
 const elements=[...doc.getElementsByTagName('*')].filter(n=>['item','entry'].includes(n.localName)).slice(0,50);
 const child=(el,names)=>[...el.children].find(n=>names.includes(n.localName));
 return elements.flatMap(el=>{
  const link=[...el.children].find(n=>n.localName==='link'&&(!n.getAttribute('rel')||n.getAttribute('rel')==='alternate'));
  const raw=link?.getAttribute('href')||link?.textContent||'';
  const url=safeLink(raw,source.site);if(!raw||!url)return [];
  const title=plainText(child(el,['title'])?.textContent,240);if(!title)return [];
  const body=child(el,['description','summary'])||child(el,['encoded','content']);
  const dateValue=child(el,['pubDate','published','updated','date'])?.textContent;
  const ms=Date.parse(dateValue);const date=Number.isFinite(ms)?new Date(ms).toISOString():null;
  return [{id:source.id+':'+url,source:source.id,title,url,date,excerpt:plainText(body?.textContent),savedAt:null}];
 });
}
export function validStory(x,ids){
 return x&&typeof x.title==='string'&&x.title.length<=240&&typeof x.excerpt==='string'&&x.excerpt.length<=650&&ids.includes(x.source)&&typeof x.url==='string'&&x.url.length<=4096&&safeLink(x.url)===x.url&&x.id===x.source+':'+x.url&&(!x.date||Number.isFinite(Date.parse(x.date)));
}
export function validateBackup(value,ids){
 if(value?.version!==1||!Array.isArray(value.sources)||!Array.isArray(value.saved)||!Array.isArray(value.read))throw new Error('This is not a HUSH Reader backup.');
 if(value.saved.length>500||value.read.length>3000)throw new Error('This backup is too large.');
 return {version:1,sources:[...new Set(value.sources.filter(x=>ids.includes(x)))],saved:value.saved.filter(x=>validStory(x,ids)).map(x=>({...x,savedAt:typeof x.savedAt==='string'?x.savedAt:null})),read:[...new Set(value.read.filter(x=>typeof x==='string'&&x.length<4200))]};
}
export function dailyStories(stories,selected,day,limit=12){
 // A finite, stable daily selection. No popularity or behavioural ranking.
 const end=Date.parse(day+'T23:59:59.999Z');const start=end-14*86400000;
 const sorted=stories.filter(x=>selected.includes(x.source)&&x.date&&Date.parse(x.date)<=end&&Date.parse(x.date)>start).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const groups=selected.map(id=>sorted.filter(x=>x.source===id));const output=[];const used=new Set();
 // Round robin stops high-volume sources overwhelming the edition.
 while(output.length<limit&&groups.some(g=>g.length)){for(const group of groups){const x=group.shift();if(x&&!used.has(x.url)){output.push(x);used.add(x.url);}if(output.length===limit)break;}}
 return output;
}
