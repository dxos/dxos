---
'@dxos/plugin-markdown': minor
---

Give the `node` plugin variants a React-free `#capabilities` barrel — chess, chess-com, file, kanban,
map, review, sheet, table, thread and transcription — so node and bun consumers no longer pull the
plugins' React surfaces, and with them `@dxos/react-ui-geo`'s country geometry. `plugin-sheet` also
gains a node-conditioned `#operations`, since its `scroll-to-anchor` operation drives a live editor
view and cannot run without a DOM.

Breaking: `@dxos/plugin-deck` and `@dxos/plugin-navtree` no longer resolve a `node` condition for
`#plugin`. Both are front-end only; the `workerd` variant is unchanged.
