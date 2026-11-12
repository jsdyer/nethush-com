import {cleanLink, generatePassword, stripPngMetadata, readChecklist} from './core.js';
const $ = id => document.getElementById(id);
const pages = [...document.querySelectorAll('.view')];
const routes = new Set(pages.map(page => page.id));
const labels = {home:'HUSH Reader',toolkit:'Privacy toolkit',cleaner:'Link cleaner',passwords:'Password generator',photos:'Photo scrubber',browser:'Browser check',checklist:'Privacy checklist',guides:'Field notes',directory:'Good neighbours',about:'Then & now',privacy:'Our privacy promise'};
function route(initial=false) {
  const requested = location.hash.slice(1);
  // Preserve the accessible skip-to-content anchor without hiding the active view.
  if (requested === 'main') { $('main').focus(); return; }
  const current = routes.has(requested) ? requested : 'home';
  for (const page of pages) page.hidden = page.id !== current;
  for (const link of document.querySelectorAll('[data-route]')) {
    if (link.dataset.route === current) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
  document.title = `net HUSH — ${labels[current]}`;
  if (!initial) { $('main').focus({preventScroll:true}); if (window.scrollY > 250) $('main').scrollIntoView({block:'start'}); }
}
window.addEventListener('hashchange',() => route());
route(true);
let toastTimer;
function toast(message) {
  $('toast').textContent=message; $('toast').hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(() => { $('toast').hidden=true; },4500);
}
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click',async () => {
    const field = $(button.dataset.copy);
    if (!field.value) { toast('Nothing to copy yet.'); return; }
    try { await navigator.clipboard.writeText(field.value); toast('Copied to your clipboard.'); }
    catch { field.focus(); field.select(); toast('Clipboard access is unavailable. The text is selected; copy it manually.'); }
  });
}
function configureCleaner(prefix, formId) {
  const form=$(formId), input=$(prefix+'-url'), result=$(prefix+'-result'), output=$(prefix+'-output');
  const clear=() => { result.hidden=true; output.value=''; form.querySelector('.form-error').textContent=''; };
  input.addEventListener('input',clear);
  if (prefix === 'full') $('remove-hash').addEventListener('change',clear);
  form.addEventListener('submit',event => {
    event.preventDefault(); clear();
    try {
      const cleaned=cleanLink(input.value,prefix==='full' && $('remove-hash').checked);
      output.value=cleaned.url; result.hidden=false;
      let message=cleaned.removed.length ? `Removed ${cleaned.removed.length} tracking parameter${cleaned.removed.length===1?'':'s'}: ${cleaned.removed.join(', ')}.` : 'No known tracking parameters found. The link may still contain other identifiers.';
      if (cleaned.fragmentRemoved) message+=' Removed the fragment too.';
      result.querySelector('.result-note').textContent=message;
    } catch (error) { form.querySelector('.form-error').textContent=error.message; }
  });
}
configureCleaner('quick','quick-clean-form');
configureCleaner('full','full-clean-form');
$('sample-link').addEventListener('click',() => {
  $('full-url').value='https://example.com/read?id=42&utm_source=newsletter&utm_medium=email&fbclid=example#chapter-2';
  $('full-clean-form').requestSubmit();
});
$('password-length').addEventListener('input',() => { $('length-value').textContent=$('password-length').value; });
$('password-form').addEventListener('submit',event => {
  event.preventDefault();
  const error=$('password-form').querySelector('.form-error'); error.textContent=''; $('password-output').value='';
  try {
    const enabled=['upper','lower','numbers','symbols'].filter(group => $('use-'+group).checked);
    $('password-output').value=generatePassword(Number($('password-length').value),enabled);
    $('password-status').textContent=`${$('password-length').value} random characters. Includes every selected group. Save this in your password manager.`;
  } catch (err) { error.textContent=err.message; $('password-status').textContent='No password generated.'; }
});
$('clear-password').addEventListener('click',() => {
  $('password-output').value=''; $('password-status').textContent='Password cleared from this page. Your system clipboard is unchanged.';
  $('password-form').querySelector('.form-error').textContent='';
});

let photoUrl=null, photoJob=0;
function clearPhoto() {
  photoJob++;
  if (photoUrl) { URL.revokeObjectURL(photoUrl); photoUrl=null; }
  $('photo-preview').removeAttribute('src'); $('photo-download').removeAttribute('href');
  $('photo-result').hidden=true; $('photo-input').value=''; $('photo-error').textContent='';
  $('photo-status').textContent='The file stays on your device. Nothing is uploaded.';
}
$('clear-photo').addEventListener('click',clearPhoto);
$('photo-input').addEventListener('change',async () => {
  const file=$('photo-input').files?.[0];
  clearPhoto();
  if (!file) return;
  const job=photoJob;
  let bitmap,canvas;
  try {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image. SVG, GIF and HEIC are not supported.');
    if (file.size > 20*1024*1024) throw new Error('Choose an image smaller than 20 MB.');
    if (!globalThis.createImageBitmap) throw new Error('This browser cannot decode images locally with this tool. Try a current Firefox, Chrome, Edge or Safari.');
    $('photo-status').textContent='Creating a fresh copy locally…';
    bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    if (job !== photoJob) return;
    if (!bitmap.width || !bitmap.height || bitmap.width*bitmap.height > 25_000_000 || bitmap.width>16384 || bitmap.height>16384) throw new Error('Choose an image up to 25 megapixels, with neither side over 16,384 pixels.');
    canvas=document.createElement('canvas'); canvas.width=bitmap.width; canvas.height=bitmap.height;
    const context=canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not create the image canvas.');
    context.drawImage(bitmap,0,0);
    const encoded=await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
    if (!encoded) throw new Error('Your browser could not export this photo. Try a smaller image.');
    const cleaned=stripPngMetadata(await encoded.arrayBuffer());
    if (job !== photoJob) return;
    const blob=new Blob([cleaned],{type:'image/png'});
    photoUrl=URL.createObjectURL(blob);
    $('photo-preview').src=photoUrl; $('photo-download').href=photoUrl;
    $('photo-info').textContent=`${bitmap.width.toLocaleString()} × ${bitmap.height.toLocaleString()} pixels · ${(blob.size/1024/1024).toFixed(2)} MB · fresh PNG · generic filename`;
    $('photo-result').hidden=false;
    $('photo-status').textContent='Ready. Original metadata was not carried over. Review the image before downloading.';
  } catch(error) {
    if (job===photoJob) { $('photo-error').textContent=error.message; $('photo-status').textContent='No cleaned file created.'; }
  } finally {
    bitmap?.close(); if(canvas){canvas.width=0;canvas.height=0;}
  }
});
window.addEventListener('pagehide',()=> { clearPhoto(); $('password-output').value=''; });

$('run-browser').addEventListener('click',() => {
  const safe=fn=>{try{return String(fn() ?? 'Not exposed');}catch{return 'Unavailable';}};
  const rows=[
    ['Secure page context',safe(() => window.isSecureContext ? 'Yes' : 'No')],
    ['Browser-reported user agent',safe(() => navigator.userAgent)],
    ['Preferred languages',safe(() => navigator.languages?.join(', '))],
    ['Timezone',safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone)],
    ['Screen dimensions',safe(() => `${screen.width} × ${screen.height} CSS pixels`)],
    ['Pixel ratio',safe(() => window.devicePixelRatio)],
    ['Logical processor count',safe(() => navigator.hardwareConcurrency)],
    ['Global Privacy Control',safe(() => navigator.globalPrivacyControl === true ? 'Enabled' : 'Not signalled / not supported')],
    ['Do Not Track signal',safe(() => navigator.doNotTrack === '1' ? 'Enabled (voluntary signal)' : 'Not signalled / not supported')],
    ['Cookie capability',safe(() => navigator.cookieEnabled ? 'Browser reports cookies enabled; this does not test third-party cookie access' : 'Browser reports cookies disabled')]
  ];
  $('browser-data').replaceChildren();
  for (const [name,value] of rows) {
    const row=document.createElement('div'), dt=document.createElement('dt'), dd=document.createElement('dd');
    dt.textContent=name; dd.textContent=value; row.append(dt,dd); $('browser-data').append(row);
  }
  $('browser-results').hidden=false; $('clear-browser').hidden=false;
  $('browser-status').textContent='Displayed locally. These reported values may be reduced or spoofed by your browser.';
  $('run-browser').textContent='Refresh browser details ↻';
});
$('clear-browser').addEventListener('click',() => {
  $('browser-data').replaceChildren(); $('browser-results').hidden=true; $('clear-browser').hidden=true;
  $('run-browser').textContent='Show my browser details →';
});

const storageKey='nethush.checklist.v1';
const tasks=[...document.querySelectorAll('[data-task]')];
const knownTasks=tasks.map(task=>task.dataset.task);
function renderChecklist() {
  const done=tasks.filter(task=>task.checked).length;
  $('check-count').textContent=`${done} of ${tasks.length} done`;
  $('check-progress').value=done;
}
function persistChecklist() {
  if ($('remember-checklist').checked) {
    try {
      localStorage.setItem(storageKey,JSON.stringify({version:1,done:tasks.filter(task=>task.checked).map(task=>task.dataset.task)}));
      $('storage-status').textContent='Saved only in this browser. Turn this option off to remove the saved checklist.';
    } catch {
      $('remember-checklist').checked=false;
      $('storage-status').textContent='Browser storage is unavailable. Changes remain in this tab only. Any older saved copy may remain until site data is cleared.';
    }
  }
}
try {
  const raw=localStorage.getItem(storageKey);
  if (raw) {
    const done=readChecklist(raw,knownTasks); tasks.forEach(task=>{task.checked=done.includes(task.dataset.task);});
    $('remember-checklist').checked=true;
    $('storage-status').textContent='Loaded your previously saved checklist from this browser.';
  }
} catch { /* In-memory functionality still works if local storage is blocked. */ }
renderChecklist();
for (const task of tasks) task.addEventListener('change',()=>{renderChecklist();persistChecklist();});
$('remember-checklist').addEventListener('change',()=>{
  if ($('remember-checklist').checked) persistChecklist();
  else {
    try { localStorage.removeItem(storageKey); $('storage-status').textContent='Saved checklist removed. Current checkmarks remain only in this tab.'; }
    catch { $('storage-status').textContent='Could not remove the saved copy. Clear this site’s browser storage to remove it.'; }
  }
});
$('reset-checklist').addEventListener('click',()=>{
  tasks.forEach(task=>{task.checked=false;}); $('remember-checklist').checked=false; renderChecklist();
  try { localStorage.removeItem(storageKey); $('storage-status').textContent='Checklist reset. Nothing saved in this browser.'; }
  catch { $('storage-status').textContent='Checkmarks cleared in this tab. Clear this site’s browser storage to remove any saved copy.'; }
});
