---
'@dxos/plugin-markdown': patch
---

Resolve an object's database via `Obj.getDatabase(obj)` (and its space id via `db.spaceId`) instead of `getSpace(obj).db`/`.id` in plugin data-access sites, dropping the `@dxos/client`/`@dxos/react-client` dependency where the full space handle was not needed.
