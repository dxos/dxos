---
'@dxos/react-ui-graph': patch
'@dxos/plugin-explorer': minor
---

The SVG graph renderer stays near 60 fps up to about 1000 nodes (previously about 500): straight edges render as `<line>`/`<polyline>` elements with drawn-in arrowheads instead of markers, and per-tick updates skip unchanged elements. Subgraph hulls follow their nodes again, and tree layouts keep their default styling when given a partial `slots` object. The explorer gains a type panel that shows or hides each object type, and its swarm view no longer draws links or opens hover cards. Opening an older message in the inbox no longer expands it briefly and folds it again; only the conversation's latest message opens.
