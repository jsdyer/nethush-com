import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {cleanLink,generatePassword,secureIndex,CHARACTER_GROUPS,stripPngMetadata,readChecklist} from '../dist/assets/core.js';

test('cleaner strips duplicate/case/encoded tracking keys, keeps meaningful parameters and fragment',()=>{
  const r=cleanLink('https://example.com/read?id=42&%75tm_source=one&utm_source=two&FBCLID=three&q=a%20b#chapter');
  assert.equal(r.url,'https://example.com/read?id=42&q=a%20b#chapter'); assert.equal(r.removed.length,3);
});
test('cleaner does not normalize the remaining signed-sensitive query representation',()=>{
  const input='HTTPS://Example.com:443/a?ref=keep&source=normal&q=a%20b&tag=a&tag=b&bad%ZZ=x#one';
  assert.equal(cleanLink(input).url,input);
  assert.equal(cleanLink('https://example.com/?q=a+b&utm_campaign=x&next=a%2fb').url,'https://example.com/?q=a+b&next=a%2fb');
});
test('fragment removal is opt-in, query-looking fragments are preserved',()=>{
  assert.equal(cleanLink('https://example.com/#?utm_source=app').url,'https://example.com/#?utm_source=app');
  assert.equal(cleanLink('https://example.com/?utm_source=x#part',true).url,'https://example.com/');
});
test('rejects dangerous or invalid schemes, credentials and whitespace',()=>{
  for(const input of ['javascript:alert(1)','data:text/html,x','ftp://example.com','https://u:p@example.com','example.com','https:example.com','https://example.com/a b','https://example.com/a\nb']) assert.throws(()=>cleanLink(input));
});
test('signed and access links are not rewritten',()=>{
  for(const key of ['sig','X-Amz-Signature','token','Signature','%73ig']) assert.throws(()=>cleanLink(`https://example.com/a?${key}=secret&utm_source=x`),/left unchanged/);
});
test('secure selection rejects bytes that would bias the result',()=>{
  const bytes=[255,254,250,7]; let i=0;
  assert.equal(secureIndex(10,{getRandomValues:arr=>{arr[0]=bytes[i++];return arr;}}),7); assert.equal(i,4);
  assert.throws(()=>secureIndex(10,{}),/unavailable/);
});
test('passwords meet length and all selected groups across every combination',()=>{
  const names=Object.keys(CHARACTER_GROUPS);
  for(let mask=1;mask<16;mask++){
    const selected=names.filter((_,i)=>mask&(1<<i));
    for(const length of [12,24,64]){
      const p=generatePassword(length,selected,webcrypto); assert.equal(p.length,length);
      const alphabet=selected.map(k=>CHARACTER_GROUPS[k]).join('');
      assert.ok([...p].every(c=>alphabet.includes(c)));
      for(const name of selected) assert.ok([...p].some(c=>CHARACTER_GROUPS[name].includes(c)));
    }
  }
});
test('no insecure fallback and invalid password configurations fail closed',()=>{
  assert.throws(()=>generatePassword(24,[])); assert.throws(()=>generatePassword(4,['upper']));
  assert.throws(()=>generatePassword(24,['missing'])); assert.throws(()=>generatePassword(24,['upper'],{}));
  const result=new Set(Array.from({length:20},()=>generatePassword(24,['upper','lower','numbers'],webcrypto))); assert.equal(result.size,20);
});
function chunk(type,data=Buffer.alloc(0)){
  const buf=Buffer.alloc(data.length+12);buf.writeUInt32BE(data.length);buf.write(type,4);data.copy(buf,8);return buf;
}
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
test('PNG output drops EXIF, XMP/text, time and trailing data, preserves display chunks byte-for-byte',()=>{
  const core=[chunk('IHDR',Buffer.alloc(13)),chunk('IDAT',Buffer.from([1,2,3])),chunk('IEND')];
  const input=Buffer.concat([signature,core[0],chunk('eXIf',Buffer.from('GPS=secret')),chunk('tEXt',Buffer.from('Name=Jeff')),chunk('iTXt',Buffer.from('XMP')),chunk('tIME',Buffer.alloc(7)),core[1],core[2],Buffer.from('trailing secret')]);
  assert.deepEqual(Buffer.from(stripPngMetadata(input)),Buffer.concat([signature,...core]));
});
test('PNG parser rejects truncation or unsupported critical chunks',()=>{
  assert.throws(()=>stripPngMetadata(new Uint8Array(60)));
  assert.throws(()=>stripPngMetadata(Buffer.concat([signature,chunk('IHDR',Buffer.alloc(13)),chunk('IDAT')])));
  assert.throws(()=>stripPngMetadata(Buffer.concat([signature,chunk('IHDR',Buffer.alloc(13)),chunk('ABCD'),chunk('IDAT'),chunk('IEND')])));
});
test('saved checklist is bounded to known task IDs and tolerates corrupted data',()=>{
  assert.deepEqual(readChecklist('{broken',['a']),[]);
  assert.deepEqual(readChecklist('{"version":1,"done":["a","evil","a",9]}',['a','b']),['a']);
  assert.deepEqual(readChecklist('{"version":2,"done":["a"]}',['a']),[]);
});
