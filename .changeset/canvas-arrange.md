---
'@dxos/react-ui-canvas': minor
---

The dynamic projection takes an `arrange` option for how ranked nodes take their slots: `rank` (id order within each rank), `crossings` (barycenter sweeps keeping the order with fewest edge crossings), `force` (a d3-force layout seeded from the ranks, snapped to free slots), `force-free` (the same, unsnapped) or `routed` (fewest crossings, then a local search of moves and swaps scored by the links as routed through the lattice's gutters). `improveSlots`, `routeCost` and `latticeEnds` are exported. The feature map canvas uses `crossings` and hides the background dots.
