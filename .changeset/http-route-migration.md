---
'@dxos/edge-client': patch
'@dxos/plugin-wnfs': patch
---

EDGE HTTP requests now use the prefix-per-service paths (`/db`, `/identity`, `/compute`, `/blob`) instead of the legacy top-level ones, per `docs/design/system/http-route-migration.md` in `dxos/edge`.

- `EdgeHttpClient`: `/spaces/*` → `/db/spaces/*`, `/identity/recover` → `/db/identity/recover`, `/agents/*` → `/identity/agents/*`, `/users/:did/agent/*` → `/identity/users/:did/agent/*`, `/functions/*` and `/workflows/*` → `/compute/*`, and `getBlobUrl` now returns `/blob/file/:key`.
- `@dxos/plugin-wnfs` blockstore requests move from `/api/file` to `/blob/file`.

Both forms answer on edge today, so this is not a breaking change for callers of these methods; `/oauth/*`, `/atproto/*`, `/registry/*`, `/status` and `/auth` are pinned and unchanged, and `/triggers/*` is left alone (it is not a migration target).
