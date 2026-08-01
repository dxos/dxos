---
'@dxos/types': minor
'@dxos/compute': minor
---

Project model unification, phase 1 (breaking, no data migration — nothing deployed): `ExternalProject` becomes `TaskSet` (`org.dxos.type.taskSet@0.2.0`), a lightweight task container whose membership is the `Task.taskSet` backref; `Task` 0.2.0 renames `assigned: Ref<Person>` to `assignee: Actor` (human or agent assignment via Person ref, DID, email, or name) and adds `failed`/`cancelled` statuses; `Outline` moves from plugin-outliner into `@dxos/types` (0.2.0, `project` → `taskSet`); `Project` 0.3.0 adds optional `goals`, `outline`, `tasks`, and `plan`; `Plan` moves from `@dxos/assistant-toolkit` into `@dxos/compute` so the `Project.plan` ref types cleanly.
