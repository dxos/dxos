---
'@dxos/plugin-space': minor
---

`SpaceOperation.DeleteField`, `SpaceOperation.RestoreField`, `KanbanOperation.DeleteCardField`, `KanbanOperation.RestoreCardField` and `TableOperation.AddRow` take the view as a reference (`Ref.Ref(View.View)`) rather than the view object, so their serialized schemas no longer embed the whole View type. Breaking: callers pass `Ref.make(view)`.
