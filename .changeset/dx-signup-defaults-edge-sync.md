---
'@dxos/app-toolkit': patch
'@dxos/plugin-client': patch
---

Register the app's schema migrations from `@dxos/app-toolkit/AppMigrations` so every host stamps a newly created default space as already migrated. `dx account signup` now drains all of an identity's spaces to EDGE concurrently before exiting, and `dx space sync` does the same when given no space id. Removed `dx halo create`, which minted a local identity with no Account behind it — use `dx account signup` or `dx account login`.
