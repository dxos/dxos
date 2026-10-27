---
'@dxos/react-ui-graph': patch
---

The SVG graph renderer stays near 60 fps up to about 1000 nodes (previously about 500): straight edges render as `<line>`/`<polyline>` elements with drawn-in arrowheads instead of markers, and per-tick updates skip unchanged elements. Subgraph hulls follow their nodes again instead of freezing at the first layout.
