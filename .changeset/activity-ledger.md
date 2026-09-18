---
'@dxos/echo': minor
'@dxos/plugin-space': patch
---

The indexer keeps an append-only activity ledger per space (Automerge changes and ops per UTC hour), counted once per change as it is indexed and backfilled from the whole change graph the first time a document is seen. `db.activity({ from, to })` exposes it as a live subscription and atom, and the space home heatmap now draws from it, so an object edited on two days shows on both, including edits that replicate late.
