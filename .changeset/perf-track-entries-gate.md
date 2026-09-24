---
'@dxos/effect': minor
'@dxos/sql-sqlite': patch
---

DevTools track entries are now off in production builds. `Performance.addTrackEntry` and the new imperative `Performance.trackEntry` put an entry on the performance timeline only under the dev server, or in a build made with `VITE_PERF_TRACK_ENTRIES=true`; the bundler folds the gate, so a gated site disappears from a build that has it off. Both bound what goes into `detail` with `Performance.summarizeDetail`, since `performance.measure` clones it in full and keeps every entry for the life of the realm.

`@dxos/sql-sqlite` records its per-statement entry through that helper, with bound parameters reduced the same way its log line already reduces them, from both the in-process client and the MessagePort worker. Measured on a loaded Composer profile, the per-query entries were the largest allocating mechanism left in the tab.
