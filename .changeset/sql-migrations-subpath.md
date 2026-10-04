---
'@dxos/index-core': patch
---

Migration modules import `SqlMigrations` from the `@dxos/sql-sqlite/SqlMigrations` subpath instead of the package barrel, so bundling `@dxos/client` no longer pulls wa-sqlite and the OPFS worker into the app's static import graph (about 100 KB off Composer's eager boot graph).
