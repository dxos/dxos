---
'@dxos/app-toolkit': patch
'@dxos/plugin-client': patch
---

Register the app's schema migrations from `@dxos/app-toolkit/AppMigrations` so every host stamps a newly created default space as already migrated, and drain all of an identity's spaces to EDGE before `dx account signup` and `dx halo create` return.
