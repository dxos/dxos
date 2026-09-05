---
'@dxos/echo': minor
'@dxos/plugin-assistant': minor
---

Reading a feed newest-first with a limit — `orderBy(Order.natural('desc')).limit(n)` — is now windowed by the index instead of scanning the whole feed and slicing the result, so a view of a feed's recent tail costs the window rather than the history behind it. Such a read also covers blocks the position authority has not acknowledged yet, so an item written locally is not missing from the window until it syncs. Relatedly, `Order.natural` over a feed now orders by the feed's append position rather than by object id; the two agree for a single writer but not for a feed several writers append to. The assistant chat thread reads through a bounded window that grows as the reader scrolls back, so opening a long-running chat no longer loads every message ever appended to it.
