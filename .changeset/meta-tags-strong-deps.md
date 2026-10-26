---
'@dxos/echo': minor
---

`Obj.getMeta(obj).tags` is now an editable array of `Tag` objects rather than `Ref<Tag>`s. Tags load with the entity that carries them, like a parent or a relation's endpoints: an object is not returned by a query until its tags are available. Breaking: `Obj.addTag`, `Relation.addTag`, `Entity.addTag` and their `removeTag` counterparts, and `tagsAtom`, take and return `Tag` objects; push a `Tag` (not `Ref.make(tag)`) into `meta.tags`. Deleting a tag does not delete the objects that carry it. Stored data is unchanged, so no migration is needed.
