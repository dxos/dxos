---
'@dxos/echo': patch
---

Live queries now wait before re-running in proportion to how long their last run took (four times the last run's time, capped at 5 s; queries under 16 ms still re-run immediately), and cheap queries run before expensive ones in each batch. A heavy query, such as a space-wide trace feed, no longer re-runs on every write and holds up faster queries and writes. Flushing indexes still runs every pending query at once. `EchoHost` accepts a `queryDebounce` option to tune this.
