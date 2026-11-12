# Validation — HUSH Reader / 12 November 2026

## Automated

25 Node tests passed. The original privacy-tool tests remain. Added checks cover feed text handling, safe link schemes, bounded backup validation, finite recent/balanced daily selection, XML entity rejection, fixed upstream URLs, cookie omission, redirect refusal, cache reuse, labelled stale fallback, failure backoff, expiry, response size caps, API method/query rejection and absence of publisher HTML injection / tracking APIs in the reader.

JavaScript syntax checks and the generated Worker's ESM validation passed. No third-party runtime packages are required.

## Browser

Chromium successfully loaded **all five real feeds** through the local reader preview. RSS and Atom entries appeared in the daily edition with source names and publication dates; Mozilla's older items remained outside the 14-day daily selection.

Verified excerpt expansion, local search by source name, saving a story, opt-in persistence across reload, JSON backup download and re-import without duplicate saved stories, and the end-of-edition state after marking the edition read. No fake headlines or fixture feed content were used in the browser check.

The browser session later blocked further observation under its URL policy, preventing a fresh full-page screenshot and a new narrow-viewport visual pass. The prior release's narrow-viewport toolkit checks are not a substitute for a device-level test of this new reader. `docs/preview.jpg` is the historical version-1 toolkit screenshot, not the current homepage.

## Limits

Not an independent security audit. Live sources can change format, return redirects, or become unavailable; the UI and service handle this explicitly. The hosted preview has a platform sign-in gate. nethush.com DNS/TLS/origin deployment has not been changed.

## News-first layout and toolkit update

31 tests passed, including SHA-256 standard vectors, checksum comparison and limits, and URL parsing for deceptive credentials, internationalised domains, non-default ports and invalid schemes. Syntax checks, the build and generated Worker validation passed.

The new desktop layout was checked in Chromium: continuous blue base beneath the curved logo, first headlines visible without scrolling, and JSD Technologies attribution in the page. Four of five sources were available during this run, with the availability count shown honestly. The link inspector correctly identified the actual destination behind misleading credentials. The screenshot in `docs/reader-preview.jpg` shows this release.

The browser file-chooser automation stalled and reset the session; the checksum file-selection flow and a new mobile visual pass could not be completed. The checksum algorithm and comparison logic were verified independently in the Node suite.

API reference used for the browser-local digest implementation: [MDN SubtleCrypto.digest](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest).
