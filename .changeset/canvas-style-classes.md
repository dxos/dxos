---
'@dxos/react-ui-canvas': minor
---

Shapes and links of a type the registry does not know render as the core base (`BaseNode`): a box showing its `label`, or a straight line. A scene shape's Scene field opens any scene of its drawing, so several shapes can share one scene. Drawings gain style classes (`StyleClass`, `SceneStore.styles`): an element naming a class in `class` is drawn with that class's style or line under its own, and the properties panel offers a Class picker and a "New class from selection" action. The node style's shared fields are exported as `styleFields` for shapes to extend. Breaking: the UML class shape keeps its name in `label` instead of `name`.
