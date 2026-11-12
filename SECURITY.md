# Security and privacy model

## What is and is not protected

All privacy-tool operations run in the browser. No tool input is put in URLs, cookies, local storage, analytics, network requests or server-side sessions. The checklist and reader each have separate explicit opt-in browser storage. Reader data includes source choices, read IDs and saved excerpts. Backup files are unencrypted and can reveal reading interests. External links make ordinary navigations only when followed. The page has no third-party subresources.

A browser-local tool still depends on the integrity of the served HTML/JavaScript, HTTPS, the browser, extensions, operating system and hosting account. This is not an independently audited security product, anonymity network, proxy, VPN, malware scanner, or password vault. The host/CDN can receive visitors' connection IPs, headers and request timestamps. Configure retention honestly; the app does not claim infrastructure-wide zero logging. The private hosted preview can include platform authentication outside this application's control.

## Link cleaner

Accepts only explicit HTTP(S) links, rejects embedded credentials and signed/access-token parameters, and never requests the target. Keeps raw non-tracking values, order and encoding. Its deliberately small list cannot identify every tracking parameter. Link validity, destination safety and final redirects are not checked. Fragments remain unless a user opts out.

## Passwords

Uses Web Crypto randomness with rejection sampling to avoid modulo bias. Samples complete strings uniformly, accepting those containing all selected groups. No insecure random fallback. Length is limited to 12–64. Results are only held in the page, cleared when requested and on pagehide. JavaScript cannot guarantee secure memory erasure. Clipboard copies can be observed by other software or clipboard sync; this page cannot reliably erase the clipboard.

## Photos

Accepts browser-decodable JPEG/PNG/WebP, limits input bytes to 20 MiB, and decoded dimensions to 25 million pixels / 16,384 per side. Browser decoding occurs before the dimension check; malicious image decoder vulnerabilities or initial decode memory exhaustion are outside this app's protection. Uses `createImageBitmap` with source orientation, a canvas raster export, and a strict PNG chunk allowlist (`IHDR`, `PLTE`, `IDAT`, `IEND`, `tRNS`). Rejects unknown critical chunks. Original EXIF/IPTC/XMP/text/time chunks and original filenames are not carried over. No assertion is made that the depicted content is anonymous. Colour profiles are not preserved, animation becomes a frame, and downloaded files acquire filesystem metadata. File objects and canvas buffers are released after use; object URLs are revoked on clear, replacement and pagehide. Race protection discards superseded operations.

## Browser check

Reads a bounded set of ordinary browser properties after a click. It does not request camera/location/microphone permissions, perform canvas fingerprinting, enumerate local fonts/devices, contact IP services, or perform DNS/WebRTC probes. Results are not stored or scored. Reported values may be spoofed or reduced.

## Deployment

Serve through the Node service over an HTTPS reverse proxy, or serve `public/` with the feed API routed to that service. Apply the supplied CSP and headers, avoid injected analytics, set a minimal log retention policy and secure the origin account. CSP in the document is a baseline; `frame-ancestors` requires an HTTP response header. The reader permits same-origin connections with `connect-src 'self'`; the privacy tools themselves still make no requests. `_headers` is host-specific and is not automatically honoured everywhere. Never serve the repository root as the production document root. Treat every source change as security-sensitive; there are no automatic dependency downloads or service-worker updates.

## Reporting

Do not put secrets, real passwords, private links or personal photos in public GitHub issues. Use the repository's private vulnerability reporting feature if the owner has enabled it. If it is unavailable, open a minimal issue requesting a private reporting channel without including exploit details or sensitive data. Private reporting is not assumed enabled by this repository.

## HUSH Reader service

The browser makes one fixed GET to `/api/edition` when the reading room opens or refreshes. It receives the same public catalogue regardless of selected sources or reading history. Platform authentication cookies may accompany this same-origin request on private hosting. No visitor cookies, headers, IP or selections are forwarded to publishers. The catalogue is operator-maintained; the API accepts no URLs, query parameters or state mutations. Redirects are refused, feed fetches time out, streaming reads are byte-bounded, and DTD/entity declarations are rejected. Operator-configured domains still require trusted DNS and egress controls; this is not a general-purpose SSRF-safe arbitrary URL fetcher.

Cache fills are triggered on demand, not on a fixed schedule; upstream requests can therefore coincide with visits. Node caches are process-local; Worker caches are regional and evictable. Failed refreshes use dated, labelled prior data for at most seven days, with retry backoff. Hosts should apply their normal public-endpoint rate limits. No per-user feed database is built.

XML is parsed as XML in the browser, with DTD/entity declarations rejected before parsing. Publisher HTML is reduced to bounded text and inserted with `textContent`; no publisher DOM nodes or resource URLs are mounted. Original links accept HTTP(S) only and reject embedded credentials, and open with `noopener noreferrer`. Opening an article leaves the reader's privacy boundary. Imports are size-bounded and validated, merge rather than replace, and cannot supply remote feed destinations. This implementation has not had an independent security audit.
