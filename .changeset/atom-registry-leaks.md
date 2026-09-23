---
'@dxos/effect': minor
---

Graphs, menus and static trees no longer pin atoms in the app's atom registry for longer than their owners live. `AtomEx.makeOwned(owner, registry, atom)` keeps an atom mounted for as long as `owner` is alive and releases it once `owner` is garbage-collected. A graph model's version atom, a graph builder's extensions and a menu's contributions now use it, so they last exactly as long as the object they belong to. An app graph's node and connection atoms are views, kept only while something reads them. A bare `registry.subscribe` on a view atom that has never been read does not fire: read it first, pass `{ immediate: true }`, or use `useAtomValue`.
