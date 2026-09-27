---
'@dxos/echo': patch
'@dxos/plugin-space': patch
---

Fixes for agent failures seen in the field:

- `EchoHost.updateIndexes` waits for the changes made before the call, not for the index to go idle.
  A stream of writes (an agent streaming its reply) never left the empty batch idleness needed, so
  every feed-scoped one-shot query issued mid-stream hung until its 20 s timeout. Index sources may
  now report `more` when a limit cut their read short, and `IndexingResult.drained` says a pass
  indexed everything its sources held.
- An agent no longer fails its whole turn when the between-turn re-read of its context bindings times
  out: `AiContext.Binder.sync` keeps the bindings its live query already holds and logs a warning.
- A type an agent describes with a closed JSON schema (`additionalProperties: false`) and no `id`
  property now accepts objects: `space-add-type` declares `id` on it, where every `space-add-object`
  used to fail with `Unknown property: id`.
- The project skill exposes `tasks-move` and `tasks-move-to-set`, so an agent moves a task to another
  project instead of hand-editing both task sets' `tasks` arrays.
