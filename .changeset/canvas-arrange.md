---
'@dxos/react-ui-canvas': minor
---

The dynamic projection takes an `arrange` option for how ranked nodes take their slots: `rank` (id order within each rank), `crossings` (barycenter sweeps keeping the order with fewest edge crossings) or `force` (a d3-force layout seeded from the ranks, snapped to free slots). The feature map canvas uses `crossings`.
