---
'@dxos/echo': minor
---

Add `Database.sync({ to: 'edge', entities, indexed })`, a barrier that waits until this peer's writes have replicated to EDGE and — with `indexed: true` — been indexed there. Connector sync now waits on it before force-running a remote sync trigger, so a trigger created moments earlier is no longer reported as "not found".
