---
'@dxos/echo': minor
---

Removed `Ref.byAnnotation` and the `ReferenceConstraint` annotation. The API was never announced and had no call sites: annotations do not participate in the type system, so it produced the same TypeScript type as `Ref.Ref(Obj.Unknown)`, and its check is synchronous, so it could only inspect a target already resident — an unresolved reference passed regardless. Use `Ref.Ref(Obj.Unknown)` and check the target in the handler after loading it.
