import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectLink,digestBytes,compareDigest,MAX_FILE_BYTES} from '../public/assets/core.js';

test('inspector separates misleading credentials from the actual host',()=>{
 const r=inspectLink('https://trusted.example:secret@evil.example/path?utm_source=email&id=42#key');
 assert.equal(r.host,'evil.example');assert.equal(r.queryCount,2);assert.deepEqual(r.tracking,['utm_source']);
 assert.match(r.notes.join(' '),/sign-in/);assert.doesNotMatch(JSON.stringify(r),/secret/);
});
test('inspector exposes IDN, ports and unencrypted protocols',()=>{
 const r=inspectLink('http://bücher.example:8080/a');
 assert.equal(r.host,'xn--bcher-kva.example');assert.equal(r.port,'8080');assert.equal(r.notes.length,3);
 assert.equal(inspectLink('https://[::1]/').host,'[::1]');
});
test('inspector rejects active schemes, relative links and ambiguous whitespace/backslashes',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,hi','//example.com','https://exam ple.com','https://example.com\\@evil.example','https://']) assert.throws(()=>inspectLink(url));
});
test('SHA-256 matches independent standard vectors for abc and empty bytes',async()=>{
 assert.equal(await digestBytes(new TextEncoder().encode('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(await digestBytes(new Uint8Array()),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});
test('checksum rejects unsupported crypto and bounds input before digesting',async()=>{
 await assert.rejects(digestBytes(new Uint8Array(),{}),/secure page/);
 await assert.rejects(digestBytes(new Uint8Array(MAX_FILE_BYTES+1),{subtle:{digest(){assert.fail('Oversized bytes must not be digested');}}}),/64 MiB/);
});
test('comparison distinguishes missing, malformed, matching and different checksums',()=>{
 const hash='ab'.repeat(32);assert.equal(compareDigest(hash,''),'empty');assert.equal(compareDigest(hash,hash.toUpperCase()+'\n'),'match');
 assert.equal(compareDigest(hash,'00'.repeat(32)),'mismatch');assert.equal(compareDigest(hash,hash+' file.zip'),'error');assert.equal(compareDigest(hash,'z'.repeat(64)),'error');
});
