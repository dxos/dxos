---
'@dxos/echo': minor
---

`Annotation.make` takes `keyed: true` for an annotation whose schema is `Schema.Record(Schema.String, …)`. A keyed annotation stores each entry under its own meta key, so peers that write different entries before syncing keep all of them, the first entries included. `get`, `set`, `update`, `atom` and `atomProperty` work unchanged; `update` runs on an empty record when there are no entries, and `Filter.annotation` rejects a keyed annotation. A record stored under the annotation's id before it became keyed is still read. `Subscription` from `@dxos/types` is now keyed, so two people who subscribe to an object at the same time are both kept.
