---
'@dxos/echo': minor
'@dxos/plugin-space': minor
---

Breaking: static types are hidden unless they opt in with `Annotation.UserType.set()` (types persisted in a space are always shown), and `HiddenAnnotation` and `CollectionItemAnnotation` are removed; mark collection items with `Annotation.UserType.set({ tags: [Collection.ItemTag] })` instead. Collections now accept any user-facing object, objects gain an Add to collection action, `AppCapabilities.DefaultParent` rules decide where an object created without a target is filed (`SpaceOperation.AddObject` consults them and now declares `Capability.Service`), and clicking an object's copy in another collection opens it there.
