---
'@dxos/echo': minor
---

Feed queries can now resume from a cursor: `Filter.feedCursor(after)` selects only the items a feed
gained past that point, and the bound is pushed into the index scan, so a reader pays for what is
new rather than for the whole feed. Combine it with `limit()` for a bounded page. The position a
feed item carries is exposed as the typed `Feed.Cursor`, read with `Feed.getCursor` and starting at
the `Feed.START` sentinel. The trigger
dispatcher uses it, and its feed and subscription triggers are now woken by their data instead of
being re-scanned in full on every poll tick — only timer triggers still need the wall clock.
