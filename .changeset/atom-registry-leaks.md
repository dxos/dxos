---
'@dxos/react-ui-menu': patch
---

Menus and static trees no longer leave atoms behind in the app's atom registry. A menu's action graph lives in a registry of its own, a graph model's version atom is mounted rather than kept alive, and a static tree model keeps its row state in the model instead of keep-alive atoms, so a rebuilt toolbar or tree, and whatever its actions captured, can be collected.
