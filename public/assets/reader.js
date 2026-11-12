import {SOURCES} from './catalog.js';
import {parseFeed,validateBackup,dailyStories} from './reader-core.js';
const $=id=>document.getElementById(id), key='nethush.reader.v1',ids=SOURCES.map(s=>s.id);
let state={version:1,sources:[...ids],saved:[],read:[]},remember=false,stories=[],health=[],loaded=false,loading=false,mode='daily',page=1;
function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
$('edition-date').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
try{const raw=localStorage.getItem(key);if(raw){state=validateBackup(JSON.parse(raw),ids);remember=true;}}catch{}
$('remember-reader').checked=remember;
function announce(text){$('reader-notice').textContent=text;}
function persist(){if(!remember)return;try{localStorage.setItem(key,JSON.stringify(state));}catch{remember=false;$('remember-reader').checked=false;announce('Storage is unavailable or full. Export a backup to keep your shelf. Any previous saved browser copy may remain.');}}
function sourceName(id){return SOURCES.find(x=>x.id===id)?.name||id;}
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,handler,cls='secondary'){const b=el('button',text,cls);b.type='button';b.addEventListener('click',handler);return b;}
function sourceControls(){
 $('reader-sources').replaceChildren();for(const source of SOURCES){const label=el('label',undefined,'source-option');const input=document.createElement('input');input.type='checkbox';input.checked=state.sources.includes(source.id);input.disabled=health.some(h=>h.id===source.id&&h.disabled);label.title=input.disabled?'Paused by the site operator.':'';input.addEventListener('change',()=>{state.sources=input.checked?[...state.sources,source.id]:state.sources.filter(x=>x!==source.id);page=1;persist();render();});label.append(input,el('span',source.name));label.append(el('small',source.topic));$('reader-sources').append(label);}
}
function status(){
 $('feed-health').replaceChildren();for(const source of SOURCES){const h=health.find(x=>x.id===source.id);const row=el('p');row.append(el('strong',source.name+' — '));row.append(document.createTextNode(h?(h.error||'Available')+(h.fetchedAt?' · fetched '+new Date(h.fetchedAt).toLocaleString():''):'Not checked yet'));$('feed-health').append(row);}
}
function render(){
 const read=new Set(state.read),saved=new Set(state.saved.map(x=>x.id));
 $('saved-count').textContent=state.saved.length;
 for(const b of document.querySelectorAll('[data-reader-mode]'))b.setAttribute('aria-pressed',String(b.dataset.readerMode===mode));
 const search=$('reader-search').value.trim().toLowerCase();
 let items=mode==='saved'?[...state.saved].reverse():mode==='daily'?dailyStories(stories,state.sources,localDay()):stories.filter(x=>state.sources.includes(x.source));
 if(mode==='unread')items=items.filter(x=>!read.has(x.id));
 if(search)items=items.filter(x=>(x.title+' '+x.excerpt+' '+sourceName(x.source)).toLowerCase().includes(search));
 const totalPages=Math.max(1,Math.ceil(items.length/12));page=Math.min(page,totalPages);
 $('reader-list').replaceChildren();
 $('edition-count').textContent=mode==='daily'?`${items.length} stories · a finite edition`:`${items.length} ${mode==='saved'?'saved ':''}${items.length===1?'story':'stories'}`;
 $('reader-empty').hidden=items.length>0;
 $('reader-empty').textContent=loading?'Collecting the shared feeds…':mode==='saved'?'Your shelf is empty. Save a story to come back to it.':!state.sources.length?'Choose at least one source in Sources & shelf.':search?'No stories match that search.':!loaded?'Your reading room is ready. Load the feeds to begin.':mode==='daily'?'No dated stories from the past 14 days are available for this selection. Check All stories or source status.':'You’re caught up here. Try another view or check source status.';
 for(const story of items.slice((page-1)*12,page*12)){
  const article=el('article',undefined,'story'+(read.has(story.id)?' story-read':''));const details=el('details');const summary=el('summary');
  const meta=el('span',sourceName(story.source)+(health.find(h=>h.id===story.source)?.stale?' · cached feed':'')+' · '+(story.date?new Date(story.date).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Undated'),'story-meta');summary.append(meta,el('span',story.title,'story-title'));if(read.has(story.id))summary.append(el('span','READ','read-marker'));details.append(summary);
  const content=el('div',undefined,'story-content');content.append(el('p',story.excerpt||'This publisher supplies a headline only. Open the original to read it.'));
  content.append(el('p','Publisher feed excerpt · not a full article','hint'));
  const actions=el('div',undefined,'actions');const external=el('a','Open original ↗','text-link');external.href=story.url;external.target='_blank';external.rel='noopener noreferrer';external.addEventListener('click',()=>{if(!state.read.includes(story.id))state.read.push(story.id);state.read=state.read.slice(-3000);persist();});
  const saveButton=button(saved.has(story.id)?'Saved ✓':'Save for later',()=>{if(state.saved.some(x=>x.id===story.id)){state.saved=state.saved.filter(x=>x.id!==story.id);announce('Removed from your shelf.');}else{if(state.saved.length>=500){announce('Shelf limit reached (500 stories). Export or remove some first.');return;}state.saved.push({...story,savedAt:new Date().toISOString()});announce(remember?'Saved on this browser.':'Saved for this tab. Enable Remember or export to keep it.');}persist();render();});
  const readButton=button(read.has(story.id)?'Mark unread':'Mark read',()=>{state.read=read.has(story.id)?state.read.filter(x=>x!==story.id):[...state.read,story.id].slice(-3000);persist();render();});
  actions.append(saveButton,readButton,external);content.append(actions);details.append(content);article.append(details);$('reader-list').append(article);
 }
 $('reader-pager').hidden=totalPages<=1;$('reader-page').textContent=`Page ${page} of ${totalPages}`;$('reader-prev').disabled=page===1;$('reader-next').disabled=page===totalPages;
 const daily=dailyStories(stories,state.sources,localDay());const finished=daily.length&&daily.every(x=>read.has(x.id));
 $('edition-end').hidden=mode!=='daily'||!items.length||!!search;
 $('edition-end-title').textContent=finished?'You’re caught up. Go enjoy the rest of your day.':'That’s your edition. The web can wait.';
 $('mark-edition').disabled=!daily.length||!!finished;
}
async function load(){
 if(loading)return;loading=true;$('refresh-reader').disabled=true;$('reader-status').textContent='Collecting public feeds through net HUSH…';render();
 try{
  const response=await fetch('api/edition',{credentials:'same-origin',cache:'no-cache',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Feed service unavailable.');const result=await response.json();if(result.version!==1||!Array.isArray(result.feeds))throw new Error('Unexpected feed response.');
  let next=[];health=[];
  for(const source of SOURCES){const feed=result.feeds.find(f=>f.id===source.id);if(!feed){health.push({id:source.id,error:'Source missing from response.'});continue;}health.push({...feed,xml:undefined});if(feed.xml)try{next.push(...parseFeed(feed.xml,source));}catch{health[health.length-1].error='Feed could not be read.';}}
  const seen=new Set();stories=next.filter(x=>{if(seen.has(x.url))return false;seen.add(x.url);return true;}).sort((a,b)=>(b.date||'').localeCompare(a.date||''));loaded=true;
  const ok=health.filter(h=>!h.error).length;
  $('reader-status').textContent=`${ok} of ${SOURCES.length} sources available · checked ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}. RSS / Atom · shared server cache.`;
 }catch{ $('reader-status').textContent='Could not reach the feed service. Your saved shelf still works. Retry later; self-hosted installs need the reader server running.'; }
 finally{loading=false;$('refresh-reader').disabled=false;status();sourceControls();render();}
}
for(const b of document.querySelectorAll('[data-reader-mode]'))b.addEventListener('click',()=>{mode=b.dataset.readerMode;page=1;render();});
$('open-reader-settings').addEventListener('click',()=>{const settings=$('reader-settings');settings.open=true;settings.scrollIntoView({block:'start'});settings.querySelector('summary').focus({preventScroll:true});});
$('reader-search').addEventListener('input',()=>{page=1;render();});
$('reader-prev').addEventListener('click',()=>{page--;render();});$('reader-next').addEventListener('click',()=>{page++;render();});
$('refresh-reader').addEventListener('click',load);
$('mark-edition').addEventListener('click',()=>{state.read=[...new Set([...state.read,...dailyStories(stories,state.sources,localDay()).map(x=>x.id)])].slice(-3000);persist();render();});
$('remember-reader').addEventListener('change',()=>{remember=$('remember-reader').checked;if(remember){persist();announce(remember?'Your source choices, read marks and shelf will stay on this browser.':'Could not save.');}else{try{localStorage.removeItem(key);announce('Saved browser copy removed. This tab keeps its current reading room.');}catch{announce('Could not clear storage. Clear site data in your browser to remove the saved copy.');}}});
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-reader').addEventListener('click',()=>download('nethush-reader-backup.json',JSON.stringify(state,null,2),'application/json'));
$('export-opml').addEventListener('click',()=>{const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');const body=SOURCES.filter(x=>state.sources.includes(x.id)).map(x=>`<outline text="${escape(x.name)}" type="rss" xmlUrl="${escape(x.url)}" htmlUrl="${escape(x.site)}"/>`).join('\n');download('nethush-sources.opml',`<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>HUSH Reader sources</title></head><body>${body}</body></opml>`,'text/xml');});
$('import-reader').addEventListener('change',async()=>{const file=$('import-reader').files?.[0];if(!file)return;try{if(file.size>2_000_000)throw new Error('Backup must be smaller than 2 MB.');const incoming=validateBackup(JSON.parse(await file.text()),ids);const merged=new Map([...state.saved,...incoming.saved].map(x=>[x.id,x]));if(merged.size>500)throw new Error('Combined shelf exceeds 500 items.');state.sources=[...new Set([...state.sources,...incoming.sources])];state.saved=[...merged.values()];state.read=[...new Set([...state.read,...incoming.read])].slice(-3000);persist();sourceControls();render();announce('Backup merged. Existing saved stories were kept.');}catch(error){announce(error.message||'Could not read this backup.');}finally{$('import-reader').value='';}});
$('clear-reader').addEventListener('click',()=>{$('clear-reader-confirm').hidden=false;});
$('cancel-reader-clear').addEventListener('click',()=>{$('clear-reader-confirm').hidden=true;});
$('confirm-reader-clear').addEventListener('click',()=>{state={version:1,sources:[...ids],saved:[],read:[]};remember=false;$('remember-reader').checked=false;try{localStorage.removeItem(key);announce('Reader data cleared.');}catch{announce('Tab cleared. Browser storage could not be removed; clear site data manually.');}$('clear-reader-confirm').hidden=true;sourceControls();render();});
sourceControls();status();render();
function enter(){if((!location.hash||location.hash==='#home')&&!loaded)load();}
window.addEventListener('hashchange',enter);enter();
