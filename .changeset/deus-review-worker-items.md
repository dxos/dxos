---
'@dxos/deus': minor
---

`deus review` now judges a worker spec's `binding`, `actor`, `route`, `keyspace` and `table` blocks. Each is a review item named `<kind>:<id>` (`binding:DATA_SERVICE`, `table:feeds`), as the spec cites it; `review check` accepts those verdicts and points a bare id at the qualified one, and the spec viewer marks the blocks with their verdicts.
