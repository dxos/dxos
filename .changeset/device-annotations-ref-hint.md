---
'@dxos/echo': minor
---

`Annotation.make` takes a `storage` option (`'space' | 'identity' | 'device'`): a `'device'` annotation still attaches to an ordinary object, but each device keeps its own value in its local database, which never replicates and is matched by `Filter.annotation` like any other (`'identity'` is reserved). References gain `ref.hint` — `'available'`, `'deleted'` or `'dangling'` — read from the target when it is loaded, or else from the local index, whose answer arrives with the object holding the reference.
