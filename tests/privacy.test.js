import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/assets/app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../dist/assets/core.js',import.meta.url),'utf8');
test('production HTML loads only first-party code and stylesheet assets',()=>{
  assert.doesNotMatch(html,/<(?:script|link|img)[^>]+(?:src|href)=["']https?:/i);
  assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);assert.match(html,/name="referrer" content="no-referrer"/);
});
test('tools cannot introduce network requests, cookies, eval or HTML injection unnoticed',()=>{
  assert.doesNotMatch(app+core,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|document\.cookie|\.innerHTML\s*=|\beval\s*\(|Math\.random\s*\(/);
});
test('local navigation references existing page IDs',()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(m[1]),`Missing page ${m[1]}`);
});
