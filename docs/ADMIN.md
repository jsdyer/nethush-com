# net HUSH control room

Open `/admin`. This is a working backend, not a mock dashboard. Statistics start at zero and are never populated with invented visitors. All collection, storage and presentation code lives in this repository. No analytics SDK, external dashboard or runtime npm package is used.

## Daily operations

- **Overview:** public HTML requests, reader API requests, source health, application errors, daily traffic chart and accessible table, section opens, response-time ranges, cache share, upstream failures and feed bytes.
- **Feed operations:** enable/pause catalogue sources and force a shared refresh, limited to once per minute. Last attempt, last successful fetch, duration and byte count remain inspectable. No arbitrary fetch URL is accepted through the admin API.
- **Reader settings:** heading, introduction, optional plain-text announcement and shared feed cache duration (5–120 minutes). Changes affect new page loads; a refresh already in progress can finish using earlier settings.
- **Measurement rules:** enable/disable counters and set 7–365-day retention (90 days by default). Reducing retention deletes older totals immediately. Feed health continues when counters are disabled.
- **Maintenance:** JSON/CSV statistics export, configuration export, explicit confirmation before erasing aggregate statistics, and recent admin actions. Exports contain the selected window, limited by retention. There is no automatic configuration restore or database upload endpoint.

The interface detects conflicting settings saves from two tabs. Reload before saving if another administrator session has changed the revision. Reload/range changes reset unsaved form edits.

## Authentication

### Self-hosted Node + SQLite

Node.js 24+ includes the SQLite implementation. Set `NETHUSH_DB` outside the public tree and `NETHUSH_ORIGIN` to the exact public HTTPS origin. Reverse-proxy all routes to Node. Run as the same OS user and with the same database path as the service:

```sh
NETHUSH_DB=/var/lib/nethush/nethush.sqlite npm run admin:password
```

The interactive terminal prompt hides the password. There is no default password, remote signup or public password-reset endpoint. Use at least 16 characters. The same command resets the password and revokes every existing admin session. Do not put passwords in command-line arguments, shell history or Git.

Passwords use a random salt and scrypt (N=32768, r=8, p=1). Sessions expire after eight hours; only a SHA-256 hash of the random session token is stored. Cookies are HttpOnly, SameSite=Strict and Secure on HTTPS (`__Host-` prefix). Loopback HTTP has a separate local cookie for development only. Mutations require the canonical Origin and a session CSRF token. Sign-in attempts share an eight-attempt/minute limit, without tracking source IPs. This can let one abusive caller temporarily delay another; it is an explicit privacy tradeoff.

Node ignores `oai-authenticated-user-*`, Host and forwarded identity headers. Production admin authentication is always the local password/session flow, not a header supplied by the client.

### Hosted preview

The private preview uses its existing platform authentication. `NETHUSH_ADMIN_EMAIL` is a server-only secret containing the owner's email. Both a platform-authenticated user ID and the exact allowlisted email are required for admin data and writes. Being signed in as some other account does not grant admin access. An unset allowlist denies everyone. The application does not expose a password login in this mode.

The platform must remain the sole ingress supplying trusted identity headers. Do not deploy that authorization adapter on a publicly reachable Node origin. For wider publication, the admin allowlist remains required even if the public reader becomes public.

## Exact measurement contract

| Stored data | Shape / retention |
| --- | --- |
| Activity counters | UTC day + allowlisted metric + integer total; 7–365 days |
| Feed health | One current row per catalogue source: attempt time, fetched time, state, duration, bytes |
| Site configuration | One current settings row and revision |
| Admin audit | Fixed action name + timestamp; 90 days, latest 30 displayed |
| Admin authentication | Self-hosted credential hash and sessions; expired sessions removed during housekeeping |
| Abuse limits | Temporary global action/window counter; no per-visitor key; expired windows removed during housekeeping |

There is no visitor table or raw event log. The app does not read IP addresses, forwarded IPs, user agents or referrers for measurement. It stores neither full, truncated nor hashed visitor IPs. No fingerprint, location, browser signature, visitor/session ID, article click, search, tool input, source preference or reading shelf is collected. Admin authentication data is separate and never joined to visitor counters.

`public/assets/measure.js` sends only `{"page":"<allowlisted-section>"}` to the same-origin `/api/count`. It sends at most once per section per document lifetime; the in-memory Set is not an identifier and is lost on reload. Same-origin credentials support the private preview's access gate; no tracking cookie is created. The server rejects extra fields, unknown section names, query parameters, oversized payloads and cross-origin submissions. This endpoint shares a global 600-request/minute counting cap; excess counts are dropped.

Global Privacy Control and Do Not Track suppress visitor activity counters, both in the browser and on the server. Operational source-fetch totals and health remain independent of those signals. With counters disabled, no aggregate totals are updated; older open pages may still send a count request, which the server discards. No client-side time-on-page, scroll depth or performance telemetry is sent.

Counts are **not unique people or sessions**. Bots, reloads, testing and forged same-origin clients can affect them. There is no fingerprinting or IP deduplication to “fix” this. The feed cache is regional on Worker hosting and per-process on Node; cache percentage is observed source-lookup reuse, not a global guarantee. Response buckets measure server handling time before counter writes, not network or browser rendering. Error counters cannot observe an origin outage or requests rejected before the application runs. Source health is on-demand, not a continuous uptime monitor.

Retention uses UTC day boundaries and runs on subsequent public activity, dashboard reads and settings saves. It is not a background erasure scheduler: an idle site will prune when used again. Purge removes the live counters, not copies in previously created exports or infrastructure backups.

## Hosting logs are a separate layer

A connection still exposes an IP address to the host/reverse proxy/CDN. The application has no access logger, but it cannot erase records created outside it. Review Apache global and virtual-host logging, CDN logs, platform observability and backup retention before making an infrastructure-wide anonymity claim.

For a dedicated Apache virtual host, remove inherited/custom combined access-log directives or route that vhost's access log to `/dev/null` if you do not need access logs. Alternatively use a deliberately minimal log format with only coarse operational fields; omit `%a`, `%h`, `%r`, query strings, referrers, user agents and cookies. Error logs may still include client addresses or paths. Configure them separately according to your operational needs. Do not change unrelated virtual hosts or disable security services blindly. This repository does not alter your server configuration.

## Storage, migration and backups

Self-hosted SQLite defaults to `var/nethush.sqlite`, outside `public/`, and runs checked-in SQL migrations at process startup. Production should use a dedicated private directory. Database and backup files use mode 0600. The service uses WAL and a busy timeout; run one Node process for the shared feed cache. D1 uses the same tables via prepared statements and atomic batches; hosted schema migrations run at deployment, never in web requests. Append future migrations; do not edit an applied migration.

Create a consistent SQLite backup (includes credentials and active admin sessions, so keep it private):

```sh
NETHUSH_DB=/var/lib/nethush/nethush.sqlite npm run backup -- /private-backups/nethush-2026-11-12.sqlite
```

The backup command refuses to replace an existing destination. To restore, stop the service, preserve the current DB and its WAL/SHM files, restore the chosen snapshot as the dedicated service user with mode 0600, and restart. Reset the admin password afterward to revoke restored sessions. Test recovery on a separate instance first. Hosted D1 backup/export/recovery is managed through the hosting platform, not the public web app.

## Inspect and validate

- `server/store.js`: strict settings validation, metric allowlist, parameterized SQL, retention.
- `server/application.js`: request classification and aggregate-only instrumentation.
- `server/admin.js`: admin routes, Origin checks, exports, count endpoint.
- `server/auth-node.mjs`: password/session authentication for self-hosting.
- `public/admin/`: first-party dashboard UI, no framework or charting SDK.
- `tests/admin.test.js`: authentication, CSRF, data minimization, concurrency, exports, retention and source controls.

Run `npm test`, `npm run check`, `npm run build` and `node scripts/validate-artifact.mjs`.

Implementation references: [Node SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html), [Node crypto](https://nodejs.org/api/crypto.html), [Cloudflare D1 prepared statements and batches](https://developers.cloudflare.com/d1/worker-api/d1-database/).
