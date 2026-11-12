import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openDatabase } from "../server/sqlite.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

console.log("Artifact is valid ESM and exports default.fetch");

// Exercise the bundled hosted authorization and persistence adapter, not only parsing.
const db=openDatabase(':memory:');
globalThis.caches={default:{async match(){return undefined;},async put(){}}};
try {
 const env={DB:db,NETHUSH_ADMIN_EMAIL:'owner@example.com'};
 const forbidden=await workerModule.default.fetch(new Request('https://nethush.test/api/admin/dashboard'),env);
 assert.equal(forbidden.status,401);
 const response=await workerModule.default.fetch(new Request('https://nethush.test/api/admin/dashboard',{headers:{'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'owner@example.com'}}),env);
 assert.equal(response.status,200);
 assert.equal((await response.json()).settings.retentionDays,90);
 const home=await workerModule.default.fetch(new Request('https://nethush.test/'),env);
 assert.equal(home.status,200);assert.match(await home.text(),/data-counting="on"/);
 assert.equal(db.raw.prepare("SELECT value FROM daily_counts WHERE metric='http.page'").get().value,1);
 console.log('Bundled Worker authorization, database reads and aggregate writes passed.');
} finally {db.close();delete globalThis.caches;}
