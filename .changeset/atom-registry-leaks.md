---
'@dxos/react-ui-menu': patch
---

Menus and static trees no longer leave atoms behind in the app's atom registry. A menu's action graph is built unpinned, a graph model's version atom reads the model's own revision instead of being kept alive, a menu's contributions atom is held only while the menu is mounted, and a static tree model keeps its row state in the model, so a rebuilt toolbar or tree, and whatever its actions captured, can be collected. Adds `AppGraph.make({ retainAtoms })` and `useAtomMount` to `@dxos/react-hooks`.
