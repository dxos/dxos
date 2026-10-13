---
'@dxos/react-ui': minor
---

- HALO and join dialog steps (identity input, profile form, reset confirmation) show their validation message again: the field is marked invalid whenever a message is present, which the field's error text requires before it renders.
- `SceneView.Root` takes `onReadonlyChange`; when given, the palette ends with a lock toggle between looking at the scene and editing it. Turning read-only drops a drawing tool back to select.
