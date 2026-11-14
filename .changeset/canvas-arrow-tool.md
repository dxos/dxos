---
'@dxos/react-ui-canvas': minor
---

Parametric shapes. A `shape` node (`ShapeNode` in `@dxos/scene`, kind `shape`) names a `recipe` and stores its `params`; the recipe (`ShapeRecipe`, `SHAPE_RECIPES`) makes the outline from the frame and the parameters, and each parameter says what it is measured against (`ParamUnit`: scene `px`, the frame's `width`, `height` or shorter side, or a `count`), so a part keeps its proportions when the frame is resized: an arrow's head is as long as a share of its height, so widening the arrow lengthens only its shaft. The recipes are arrow, double arrow, chevron, callout, parallelogram, trapezoid, cross, star and cog; each has a tool in the palette, sharing one flyout (`SHAPE_FOLD`), with Arrow on `A`.

A shape selected alone shows an adjust handle for each of its recipe's controls (`shapeNodeHandles`); dragging one sets its parameter (`dragShapeNodeParam`, the `param` drag, `onParamPointerDown`). The Properties panel lists the recipe's parameters with their ranges, and its Shape field turns the node into another recipe. Join and Subtract take a shape's outline (`nodeRings`), and lifting 2D to 3D stands a shape up as a `mesh` over its outline (`prismMesh`, `triangulate`), which flattens back to the shape. A recipe a build does not have is drawn as its frame.
