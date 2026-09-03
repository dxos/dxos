---
'@dxos/echo': minor
'@dxos/plugin-assistant': minor
---

Add `Filter.feedTail()`, which windows a feed's cursor range from its end so a `limit()` keeps the newest items rather than the oldest — what a view of a feed's recent tail needs to pay for what it renders instead of for the whole feed. Unlike a plain cursor read, an unbounded tail read also returns blocks the position authority has not acknowledged yet, so a locally written item is not missing from the window until it syncs. The assistant chat thread now reads its messages through a bounded tail window that grows as the reader scrolls back, so opening a long-running chat no longer loads every message ever appended to it.
