# net HUSH

**A little less noise. A little more privacy.**

A modern reboot of the original 2001 net HUSH anonymous-surfing site, built for **nethush.com**. The familiar blue-and-white masthead, curved wordmark area, narrow sidebar and simple section bars are back. Today's version is an independent privacy toolkit whose inputs stay in the browser.

[Source](https://github.com/jsdyer/nethush-com) · [Deployment](docs/DEPLOYMENT.md) · [Security model](SECURITY.md)

![net HUSH desktop preview](docs/preview.jpg)

## Working features

- **Link cleaner:** removes known campaign/click parameters without requesting the destination. Preserves remaining raw query encoding and order. Fragments are optional; signed/access-token links are rejected unchanged.
- **Password generator:** 12–64 characters, selectable character groups, `crypto.getRandomValues`, unbiased rejection sampling, and every selected group represented. No `Math.random`, password storage or API call.
- **Photo scrubber:** JPEG, PNG and WebP decoded locally, exported as a fresh PNG, then stripped of non-display PNG chunks. Generic output filename; original untouched. 20 MiB / 25 MP limits. No image upload.
- **Browser check:** click-to-run display of a small set of browser-reported values, with no network probes, fingerprint database or invented privacy score.
- **Privacy checklist:** eight practical steps, in memory by default. Optional browser-local persistence; turning it off or resetting removes the saved checklist.
- **Field notes, project directory, history and an explicit privacy statement.**

No runtime dependencies, build step, external fonts, CDNs, analytics, accounts or database. HTML + CSS + vanilla JavaScript ES modules. All application assets are self-hosted. A restrictive CSP includes `connect-src 'none'` and `form-action 'none'`.

This is **not an anonymous proxy or VPN**, does not change visitors' IPs, and is not an audited security product. The web host can still receive connection information. See [SECURITY.md](SECURITY.md).

## Run locally

With Python 3:

```sh
python3 -m http.server 8000 --directory dist --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. Use localhost or HTTPS for secure browser APIs. Do not open `index.html` with `file://`; ES module loading may be blocked. PHP's local development server works too:

```sh
php -S 127.0.0.1:8000 -t dist
```

Neither development server is for public production use. Apache can serve `dist/` directly with no PHP or MariaDB needed. This fits a LAMP server while keeping private inputs off the server.

## Check the code

Node.js 22 or newer, no dependency installation:

```sh
npm test
npm run check
```

The tests cover raw URL preservation, unsafe schemes/credentials, signed links, random selection and password constraints, PNG metadata removal, corrupt checklist storage, navigation targets and accidental network/storage regressions.

## Project structure

```text
dist/                 Deploy only this directory
  index.html          All views and content, including a no-JS reading fallback
  assets/style.css    Responsive original-inspired layout
  assets/app.js       UI, routing, clipboard, image processing, optional checklist storage
  assets/core.js      Testable URL, randomness, PNG and storage parsing operations
  .htaccess           Apache headers
  _headers            Headers for static hosts that support this file
 tests/               Node built-in test runner
 docs/                Deployment, validation and possible future work
 .openai/hosting.json Private preview hosting configuration
```

The project uses hash navigation, so no rewrite rules or SPA fallback are required. Without JavaScript, all content sections remain readable and anchors work; tools require JavaScript. Mobile navigation becomes a horizontally scrollable strip. No service worker caches stale security-sensitive code.

## Direction

Practical, inspectable, self-hostable tools and plain-language education. Keep it simple. Potential next additions are in [docs/ROADMAP.md](docs/ROADMAP.md); they are not promised or implemented services.

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE). The original net HUSH name and history are retained as the owner's project identity; the licence does not imply endorsement of unrelated deployments.
