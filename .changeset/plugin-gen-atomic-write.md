---
'@dxos/app-framework': patch
---

`dx-plugin gen` writes generated barrels and `package.json` through a rename and only when they change, so parallel `gen-modules` tasks no longer read a half-written manifest and fail with `Unexpected end of JSON input`.
