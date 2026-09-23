---
'@dxos/app-framework': minor
---

`Capability.AnyTag` is one interface rather than `Tag<any, any> | MultiTag<any, any>`. Both tag types remain assignable to it (`Context.Key` is covariant in both parameters), so a value that satisfied the union still satisfies the interface, and `Tag`, `MultiTag` and `IdentifierOf` are unchanged. Generic code that discriminated on the union's constituents — for instance instantiating `IdentifierOf<AnyTag>`, which is now `never` — needs the concrete tag type instead.
