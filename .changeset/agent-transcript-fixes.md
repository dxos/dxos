---
'@dxos/echo': patch
'@dxos/plugin-space': patch
---

Fixes for agent failures seen in the field:

- An agent no longer fails its whole turn when the between-turn re-read of its context bindings times
  out: `AiContext.Binder.sync` keeps the bindings its live query already holds and logs a warning.
- A type an agent describes with a closed JSON schema (`additionalProperties: false`) and no `id`
  property now accepts objects: `space-add-type` declares `id` on it, where every `space-add-object`
  used to fail with `Unknown property: id`.
- The project skill exposes `tasks-move` and `tasks-move-to-set`, so an agent moves a task to another
  project instead of hand-editing both task sets' `tasks` arrays.
