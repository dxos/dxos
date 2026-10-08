---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-illustrator': patch
---

Shapes and links of a type the registry does not know render as the core base (`BaseNode`): a box showing its `label`, or a straight line. A scene shape's Scene field opens any scene of its drawing, so several shapes can share one scene. Drawings gain style classes (`StyleClass`, `SceneStore.styles`): an element naming a class in `class` derives its style or line from it, and editing a classed element's look edits the class, so every element of it changes together. The properties panel offers a Class picker and a "New class from selection" action. Selecting several elements offers "New scene from selection" (`groupIntoScene`), which moves the selected nodes and the links between them into a new scene behind one scene shape. The node style's shared fields are exported as `styleFields` for shapes to extend. Breaking: the UML class shape keeps its name in `label` instead of `name`. A drawing's `Canvas` keeps its classes in a new optional `styles` map beside `content`.
