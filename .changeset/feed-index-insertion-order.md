---
'@dxos/echo': patch
---

Feed objects that were skipped by an index rebuild are indexed again.

- `@dxos/echo-host`: a feed index read from an empty cursor now starts at insertion id -1. Before, it paged the first batch by position and resumed by insertion id, so a block inserted early but positioned late (a local block the authority positioned afterwards) was skipped whenever the feed's cursor was reset, leaving its object with stale index rows or none.
- `@dxos/index-core`: tracker migration 0010 resets the feed cursors of the primary indexes, so the next boot re-reads every feed block once and indexes the objects earlier resets skipped.
