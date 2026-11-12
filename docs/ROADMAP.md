# Where HUSH Reader can go next

The daily application is implemented: shared feed collection, local source choices, a finite edition, unread tracking, a saved shelf and portable backups. The privacy tools support that routine.

Potential next work, not shipped features:

1. Broaden the operator-reviewed catalogue with Canadian independent publishers, privacy projects, Linux communities and personal blogs. Verify direct feed endpoints and content permissions.
2. Add user feed subscriptions only after designing URL/redirect/DNS-rebinding protections, rate limits and a privacy model that does not expose personal subscription lists upstream.
3. Offer a versioned offline pack with explicit updates. Saved excerpts currently work in a loaded page; there is no offline service worker or offline cold-start guarantee.
4. Explore an encrypted cross-device reading shelf with established audited components. Current browser storage and JSON backups are not encrypted by the app.
5. Add a maintained archive of the original net HUSH after confirming publication rights.

A universal anonymous browsing proxy is not implemented. HUSH Reader provides a narrower useful boundary: browse publisher feed excerpts without loading publisher websites. Opening original articles connects directly to them.
