// Public measurement contract: one enum, no identifiers, no input values, no history.
// The server also enforces the allowlist, opt-outs and the measurement toggle.
const allowed=new Set(['home','toolkit','cleaner','passwords','photos','inspector','checksum','browser','checklist','guides','directory','about','privacy']);
const counted=new Set();
function count(){
 if(document.body.dataset.counting!=='on'||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1')return;
 const hash=location.hash.slice(1);if(hash==='main')return;const page=allowed.has(hash)?hash:'home';if(counted.has(page))return;counted.add(page);
 fetch('/api/count',{method:'POST',credentials:'same-origin',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({page})}).catch(()=>{});
}
window.addEventListener('hashchange',count);count();
