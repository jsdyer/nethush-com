# Security and privacy model

## What is and is not protected

All tool operations run in the browser. No tool input is put in URLs, cookies, local storage, analytics, network requests or server-side sessions. Only the checklist can be stored, after an explicit user opt-in. External links make ordinary navigations only when followed. The page has no third-party subresources.

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

Serve `dist/` only, over HTTPS. Apply the supplied CSP and headers, avoid injected analytics, set a minimal log retention policy and secure the origin account. CSP in the document is a baseline; `frame-ancestors` requires an HTTP response header. `_headers` is host-specific and is not automatically honoured everywhere. Never serve the repository root as the production document root. Treat every source change as security-sensitive; there are no automatic dependency downloads or service-worker updates.

## Reporting

Do not put secrets, real passwords, private links or personal photos in public GitHub issues. Use the repository's private vulnerability reporting feature if the owner has enabled it. If it is unavailable, open a minimal issue requesting a private reporting channel without including exploit details or sensitive data. Private reporting is not assumed enabled by this repository.
