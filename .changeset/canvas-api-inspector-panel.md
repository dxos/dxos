---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
---

`SceneView` is renamed `Canvas` (`SceneView.Canvas` is now `Canvas.Viewport`), and its inspectors sit in one `InspectorPanel` that docks beside the canvas or floats over it, with each inspector framed by an `InspectorSection`. Background dots now hold their size while the view moves, a trackpad swipe pans in both directions, each drawn frame opens onto a scene of its own, and drilling into an empty or nested frame zooms and returns level by level. A number field with a fractional step rounds to that step, and opacity is bounded to 0–1.
