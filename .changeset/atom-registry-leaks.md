---
'@dxos/react-ui-menu': patch
---

Graphs, menus and static trees no longer pin atoms in the app's atom registry. An app graph's node atoms, a graph model's version atom, a graph builder's extensions and a menu's contributions now live only while something reads them, with any state they carry held by the object that owns it, so a rebuilt toolbar, menu or tree, and whatever its actions captured, can be collected. A bare `registry.subscribe` on an app graph atom that has never been read no longer fires; read it first, pass `{ immediate: true }`, or use `useAtomValue`.
