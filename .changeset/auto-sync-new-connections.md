---
'@dxos/plugin-connector': patch
---

Group a connector's sync surface into a nested `sync` field (`operation`, `getTargets`, `materializeTarget`, `optionsSchema`) with an optional `trigger` spec and an `auto` flag. A connector that declares a trigger spec is synced by force-running its binding's Routine trigger — on demand as well as on schedule, so both share the dispatcher's durable execution — and one that declares `auto` syncs as soon as a binding is created.
