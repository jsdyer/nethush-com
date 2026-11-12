// Pure, dependency-free operations. No network or storage access.
export const TRACKING_KEYS = new Set(['fbclid','gclid','dclid','msclkid','gbraid','wbraid','twclid','ttclid','yclid','igshid','mc_cid','mc_eid','_hsenc','_hsmi','mkt_tok','vero_id','vero_conv']);
const SIGNED_KEYS = new Set(['signature','sig','token','access_token','auth','authorization','x-amz-signature','x-goog-signature','policy','key-pair-id']);
export function cleanLink(input, removeFragment = false) {
  const original = input.trim();
  if (!original || original.length > 20000 || /[\s\u0000-\u001f\u007f]/u.test(original)) throw new Error('Enter a complete http:// or https:// link without spaces.');
  let parsed;
  try { parsed = new URL(original); } catch { throw new Error('Enter a complete link, including https:// or http://.'); }
  if (!/^https?:\/\//i.test(original) || !['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http:// and https:// links are supported.');
  if (parsed.username || parsed.password) throw new Error('This link contains sign-in credentials. Don’t share it.');
  const fragmentIndex = original.indexOf('#');
  const fragment = fragmentIndex >= 0 ? original.slice(fragmentIndex) : '';
  const beforeFragment = fragmentIndex >= 0 ? original.slice(0, fragmentIndex) : original;
  const queryIndex = beforeFragment.indexOf('?');
  const base = queryIndex >= 0 ? beforeFragment.slice(0, queryIndex) : beforeFragment;
  const query = queryIndex >= 0 ? beforeFragment.slice(queryIndex + 1) : '';
  // Work on raw query components so remaining values/escapes/order are untouched.
  const parts = queryIndex >= 0 ? query.split('&') : [];
  const keyOf = part => {
    try { return decodeURIComponent(part.split('=', 1)[0].replace(/\+/g, ' ')).toLowerCase(); }
    catch { return null; }
  };
  if (parts.some(part => SIGNED_KEYS.has(keyOf(part)))) throw new Error('This may be a signed or access-controlled link. It was left unchanged; removing parameters could break access or expose a private link.');
  const removed = [];
  const kept = parts.filter(part => {
    const key = keyOf(part);
    const tracking = key !== null && (key.startsWith('utm_') || TRACKING_KEYS.has(key));
    if (tracking) removed.push(key);
    return !tracking;
  });
  const resultQuery = removed.length ? (kept.length ? '?' + kept.join('&') : '') : (queryIndex >= 0 ? '?' + query : '');
  return { url: base + resultQuery + (removeFragment ? '' : fragment), removed, fragmentRemoved: removeFragment && !!fragment };
}

export const CHARACTER_GROUPS = Object.freeze({upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',lower:'abcdefghijklmnopqrstuvwxyz',numbers:'0123456789',symbols:'!@#$%^&*()-_=+[]{}:,.?'});
export function secureIndex(limit, source = globalThis.crypto) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 256) throw new Error('Invalid random-selection range.');
  if (!source?.getRandomValues) throw new Error('Secure randomness is unavailable in this browser. No password was generated.');
  // Rejection sampling avoids modulo bias when the alphabet does not divide 256.
  const ceiling = 256 - (256 % limit);
  const buffer = new Uint8Array(1);
  for (let attempts = 0; attempts < 1024; attempts++) {
    source.getRandomValues(buffer);
    if (buffer[0] < ceiling) return buffer[0] % limit;
  }
  throw new Error('The random source failed. Try another browser.');
}
export function generatePassword(length, enabled, source = globalThis.crypto) {
  if (!Number.isInteger(length) || length < 12 || length > 64) throw new Error('Choose a length between 12 and 64.');
  const names = [...new Set(enabled)];
  if (!names.length || names.some(key => !Object.hasOwn(CHARACTER_GROUPS, key))) throw new Error('Select at least one character group.');
  const groups = names.map(key => CHARACTER_GROUPS[key]);
  const alphabet = groups.join('');
  // Uniformly sample whole strings, accepting only ones containing every selected group.
  for (let attempt = 0; attempt < 2048; attempt++) {
    const password = Array.from({length}, () => alphabet[secureIndex(alphabet.length, source)]).join('');
    if (groups.every(group => [...password].some(char => group.includes(char)))) return password;
  }
  throw new Error('Could not generate a password. Try again.');
}

// Keep only PNG display chunks. Browser-added ancillary chunks are omitted as well.
// Existing chunk bytes and CRCs are retained, so no new encoder or checksum is needed.
export function stripPngMetadata(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const magic = [137,80,78,71,13,10,26,10];
  if (bytes.length < 33 || !magic.every((v,i) => bytes[i] === v)) throw new Error('The image could not be exported as a PNG.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const keep = new Set(['IHDR','PLTE','IDAT','IEND','tRNS']);
  const chunks = [bytes.slice(0,8)];
  let offset=8, seenHeader=false, seenData=false, seenEnd=false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const end = offset + length + 12;
    if (end > bytes.length) throw new Error('Incomplete PNG export.');
    const type = String.fromCharCode(...bytes.slice(offset+4,offset+8));
    if (!seenHeader && (type !== 'IHDR' || length !== 13)) throw new Error('Invalid PNG header.');
    if (type === 'IHDR') { if (seenHeader) throw new Error('Duplicate PNG header.'); seenHeader=true; }
    if (type === 'IDAT') seenData=true;
    if (keep.has(type)) chunks.push(bytes.slice(offset,end));
    else if (type[0] === type[0].toUpperCase()) throw new Error('Unsupported PNG format.');
    offset=end;
    if (type === 'IEND') { if (length !== 0) throw new Error('Invalid PNG ending.'); seenEnd=true; break; }
  }
  if (!seenHeader || !seenData || !seenEnd) throw new Error('Incomplete PNG export.');
  const result = new Uint8Array(chunks.reduce((size,chunk) => size + chunk.length,0));
  let position=0;
  for (const chunk of chunks) { result.set(chunk,position); position+=chunk.length; }
  return result;
}
export function readChecklist(raw, knownTasks) {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.done)) return [];
    return [...new Set(value.done.filter(id => knownTasks.includes(id)))];
  } catch { return []; }
}

export function inspectLink(input) {
  const text=input.trim();
  if (!text || text.length>20000 || /[\s\u0000-\u001f\u007f\\]/u.test(text) || !/^https?:\/\//i.test(text)) throw new Error('Enter a complete http:// or https:// address without spaces or backslashes.');
  let url;try { url=new URL(text); } catch { throw new Error('This address could not be parsed.'); }
  if (!['http:','https:'].includes(url.protocol) || !url.hostname) throw new Error('Only HTTP and HTTPS web addresses are supported.');
  const keys=[...url.searchParams.keys()];
  const tracking=[...new Set(keys.filter(key=>key.toLowerCase().startsWith('utm_') || TRACKING_KEYS.has(key.toLowerCase())))];
  const notes=[];
  if (url.username || url.password) notes.push('Contains sign-in information before @. That is not the destination host. Do not share this link; credentials are hidden here.');
  if (url.protocol==='http:') notes.push('HTTP does not encrypt the connection.');
  if (url.hostname.split('.').some(label=>label.startsWith('xn--'))) notes.push('Internationalised domain: the ASCII (Punycode) hostname is shown. Check it carefully for lookalike names.');
  if (url.port) notes.push('Uses a non-default port: '+url.port+'.');
  if (tracking.length) notes.push('Known tracking parameters: '+tracking.join(', ')+'. The link cleaner can remove many common identifiers.');
  if (url.hash) notes.push('Includes a fragment. It can contain identifiers or information used by page scripts.');
  if (!notes.length) notes.push('No listed structural flags found. This is not a guarantee that the link is safe or free of identifiers.');
  return {host:url.hostname,scheme:url.protocol.slice(0,-1).toUpperCase(),port:url.port || (url.protocol==='https:'?'443 (default)':'80 (default)'),path:url.pathname,queryCount:keys.length,tracking,notes};
}

// Web Crypto reads the full input; the cap bounds memory use on small devices.
export const MAX_FILE_BYTES=64*1024*1024;
export async function digestBytes(bytes, source=globalThis.crypto) {
  if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes)) throw new Error('Expected file bytes.');
  if (bytes.byteLength>MAX_FILE_BYTES) throw new Error('Choose a file no larger than 64 MiB.');
  if (!source?.subtle) throw new Error('SHA-256 requires a secure page context and Web Crypto support.');
  const result=await source.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(result),b=>b.toString(16).padStart(2,'0')).join('');
}
export function compareDigest(actual, expected) {
  const candidate=expected.trim();
  if (!candidate) return 'empty';
  if (!/^[a-f\d]{64}$/i.test(candidate)) return 'error';
  return actual.toLowerCase()===candidate.toLowerCase()?'match':'mismatch';
}
