---
'@dxos/app-toolkit': minor
'@dxos/plugin-space': minor
---

`SpaceOperation.Create` takes an optional `origin` that overrides the invoker's `Database.Origin` for the `space.create` event, so seeded spaces can report `system` rather than `user`. The new `AppAnnotation.addRootCollection(db)` adds a space's root collection as a `system` write, and every place that creates a root collection uses it. Root collections previously reported `unknown`, which counted each new space as a person adding an object.
