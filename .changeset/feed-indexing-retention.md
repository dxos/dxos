---
'@dxos/echo': minor
---

A feed's indexing and retention are now options on the `Feed` object: `Feed.setIndexing(feed, { enabled })` turns indexing of its items off or on, and `Feed.setRetention(feed, { maxLength, maxAge })` trims it by count and age on the device. `Feed.setRetention` no longer takes `{ cursor }` and no longer needs `Database.Service`.
