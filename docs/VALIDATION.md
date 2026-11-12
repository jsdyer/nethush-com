# Validation — 12 November 2026

- Node built-in test runner: 14 tests passed. URL validation and lossless query handling, signed-link protection, secure random selection, every password-group combination, PNG chunk filtering, checklist corruption tolerance, local navigation, and network/HTML-injection regression guards.
- Both JavaScript modules passed syntax checks.
- Chromium desktop: homepage renders; quick cleaner removed two tracking parameters and kept the ID/fragment; full cleaner example removed three tracking parameters.
- Browser password generator produced a 24-character result with the selected groups.
- Browser photo scrubber processed a synthetic 120 × 80 PNG containing a private test comment. The downloaded result decoded successfully in Pillow at 120 × 80, had no embedded metadata in Pillow's `info`, and did not contain the test comment bytes.
- Browser footprint details rendered after a click. Photo clearing removed its preview.
- Checklist opt-in survived reload; reset followed by reload returned to zero and disabled persistence.
- Responsive layout inspected at 545 and 340 CSS pixels using browser zoom. Document width stayed within the viewport. Full link-cleaner interaction also succeeded at 340 CSS pixels. This is a narrow-viewport check, not a physical-device certification.
- Desktop screenshot: [preview.jpg](preview.jpg).

Limits: browser QA used Chromium only. Automated tests are not a security audit. Hosting/DNS/TLS on nethush.com were not configured or tested. The private preview uses its own hosting platform. Third-party browser-extension console errors were observed; no application error was observed during the exercised flows.
