# Deploy nethush.com

Version 2 adds a live reader backend. **Do not deploy the old static `dist/` layout.** No database or npm dependencies are required; use Node.js 24+ for self-hosting.

## Apache + a small Node service

Clone the repository to `/var/www/nethush-com` (or your preferred path). Run `npm start` under a dedicated unprivileged service user with Node 24 available. It listens on `127.0.0.1:4173` by default. All pages and the feed endpoint can be reverse-proxied together:

```apache
# Inside your existing HTTPS virtual host with valid certificate configuration:
ServerName nethush.com
ServerAlias www.nethush.com
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:4173/
ProxyPassReverse / http://127.0.0.1:4173/
```

Enable `proxy`, `proxy_http` and `headers` through your distribution's configuration. Keep the Node bind address on loopback; configure TLS, HTTP-to-HTTPS redirects, service supervision, log retention and DNS using your normal deployment process. No DNS or certificate changes are made by this repository.

Example systemd service (adjust Node path and user to your host):

```ini
[Unit]
Description=net HUSH reader
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=nethush
Group=nethush
WorkingDirectory=/var/www/nethush-com
ExecStart=/usr/bin/node --use-env-proxy server/local.mjs
Environment=PORT=4173
Environment=HOST=127.0.0.1
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
[Install]
WantedBy=multi-user.target
```

Alternatively, serve `public/` with Apache and reverse-proxy exactly `/api/edition` to the Node service. Apply the supplied `public/.htaccess` headers (or copy them into the virtual host). Never serve the repository root. A static-only host will show a feed-service error; the local toolkit and saved shelf still work.

## Feed collection

The catalogue is `public/assets/catalog.js`. Only operator-configured HTTPS feeds are fetched; visitors cannot supply fetch URLs. No redirects are followed. To add a source, verify its direct feed endpoint, add a stable ID and website URL, then restart/redeploy. Use a host allowlist for these destinations in production egress policy. Run one Node process for a single shared in-memory cache; multiple processes have separate caches.

Feeds refresh on demand after 20 minutes. No cron or external automation is required. Restarting Node clears its feed cache; visitor reading data stays in visitors' browsers. Worker hosting uses the platform's regional cache. Cache eviction or different regions can cause extra refreshes, so the cache interval is a reuse target, not a global rate-limit guarantee.

Fetches have a 9-second timeout and 1.5 MB decoded-byte cap per source. Failures back off and may use an explicitly labelled copy up to seven days old. Failed or redirected feeds remain visibly unavailable. Do not enable third-party analytics injection or assume app privacy claims configure your CDN logs.

## Hosted preview

The existing `.openai/hosting.json` project is now a Worker deployment. `npm run build` embeds the first-party files in the Worker; source must be pushed before packaging/publishing. It contains no private credentials or user data. The hosted preview keeps its existing private audience and may require platform authentication. The same live collection logic runs there.

## Verify

Check page loading, `/api/edition` success, source status, excerpt expansion, optional persistence and export/restore. Verify TLS and response security headers. Browser requests should go only to this origin until an original-article or other external link is clicked. Source choices and search terms must never appear in API request URLs or bodies.
