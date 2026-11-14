---
'@dxos/react-ui-canvas': patch
---

Parametric shapes, after review. Dragging an adjust handle previews through the host's `constrain`, and releasing it writes only the handle's own parameter over the shape's latest (`paramDrop`), so a change made to another parameter meanwhile is kept and a press that never moved writes nothing. A shape's 3D solid is cut from its outline without repeated or in-line vertices, which a recipe fitted to a small frame produces, and `prismMesh` returns nothing rather than an open solid where the cap cannot be cut whole. `liftLayout` takes the model's objects, so an element that places a shape object stands as its own outline, in its own frame and with its own parameters. A parallelogram's slant stops at half its width, so a tall one keeps a body. The Properties panel reads a text's default padding from the drawing's own grid (`PropertiesInspector`'s `grid`).
