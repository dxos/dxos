---
'@dxos/plugin-space': patch
---

A type an agent describes with a closed JSON schema (`additionalProperties: false`) and no `id`
property now accepts objects: `space-add-type` declares `id` on it, where every `space-add-object`
used to fail with `Unknown property: id`. The project skill also exposes `tasks-move` and
`tasks-move-to-set`, so an agent moves a task to another project instead of hand-editing both task
sets' `tasks` arrays.
