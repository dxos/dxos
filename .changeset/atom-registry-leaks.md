---
'@dxos/effect': minor
---

Graphs, menus and static trees keep atoms in the app's atom registry only for as long as the thing they belong to. An app graph pins each node's atom while the node is in the graph and releases it on `release` or when the graph is disposed with the new `AppGraph.dispose(graph)`; the app graph plugin and the menu hooks dispose their graphs. `AtomEx.makeOwned(owner, registry, atom)` keeps an atom mounted while `owner` is alive and releases it once `owner` is garbage-collected; a graph model's version atom, a graph builder's extensions and a menu's contributions use it. Other graph atoms (edges, connections, actions) are views kept only while read: subscribe to them with `{ immediate: true }` or read them with `useAtomValue`.
