---
'@dxos/react-ui-canvas': patch
---

Panning the canvas no longer re-renders its panels and toolbars, only the view itself. New scene from selection and New class from selection move from the Properties inspector to the inspector panel's toolbar (`InspectorPanel.Root` takes `actions`).
