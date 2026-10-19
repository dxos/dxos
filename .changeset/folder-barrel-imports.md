---
'@dxos/eslint-plugin-rules': minor
---

Add the `folder-barrel-imports` rule, which requires a relative import into another folder to go through that folder's barrel (`index` or `testing` by default, configurable via `barrels`, with an `allow` list for exempt importers).
