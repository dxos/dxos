---
'@dxos/react-ui-form': minor
---

Add `fieldOverrides` to `Form.Root` for per-field label, description, placeholder, readonly, hidden, numeric bounds and indeterminate (multi-object "Mixed") values, a `fixed` grid in form layouts, and an indeterminate `Switch`; Enter in a text field commits it as leaving it does. The canvas properties panel floats over the scene and edits several selected elements at once with the standard form fields; nodes gain a ports-per-side property, a link dropped on empty canvas creates a copy of its source shape, a selected node hides its ports, and canvas shortcuts fire only while the canvas has focus.

Breaking: `StepAnnotationId` moves from `@dxos/react-ui-form` to `@dxos/ui-types` (`StepAnnotation` stays in `@dxos/react-ui-form`); `@dxos/react-ui-canvas` renames `DebugToolbar` to `CameraToolbar` (it now takes `actions` and carries fit and zoom), drops the `grid` prop from `Properties`, and lays out `SceneView.Navigation`, `Actions` and `Debug` by their `classNames` on a positioned frame rather than on the toolbar.
