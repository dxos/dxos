---
'@dxos/react-ui': patch
---

The `Loading` testing component no longer crashes under a production React build, where `captureOwnerStack` is not exported.
