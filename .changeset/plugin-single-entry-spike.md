---
'@dxos/app-framework': minor
---

Single-entry plugin authoring: `Plugin.addModule` skips `undefined` (headless barrels stub excluded modules), module specs and makers accept an `environments` annotation, and the package ships a `dx-plugin` bin that generates the per-environment `#capabilities` barrels (`src/capabilities/gen/`) and syncs the package.json condition map from those annotations.
