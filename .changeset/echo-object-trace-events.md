---
'@dxos/echo': minor
'@dxos/plugin-observability': minor
---

Report every object a user creates as the `space.object.add` product event, including objects an agent tool or a view creates with `db.add`. ECHO emits `echo.object.add` and `echo.object.remove` on a new vendor-neutral `trace.events` channel in `@dxos/tracing`. Seeding code opts out with the `track: false` add option or by providing `Database.Track` as `false`.
