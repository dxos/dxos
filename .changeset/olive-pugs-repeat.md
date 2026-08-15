---
'@dxos/plugin-space': minor
---

Add `addObject`, `getObject`, `updateObject`, `removeObjects` and `queryObjects` as MCP-projected operations, so a remote agent can read and write space objects through the same verbs the app uses. `addObject` and `removeObjects` now accept references and object descriptions alongside live entities.
