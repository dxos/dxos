# ECHO API

## 0.9.0

- [ ] Database, Queue, Space, Type, namespaces.
- [ ] Support class variant for types.
- [ ] Support defaults.
- [ ] Support effect Date, Timestamp formats.
- [ ] Metadata for created, updated timestamps.
- [ ] Effect team design review.
- [ ] @category annotations to group types in the API.
- [ ] TSdoc and LLM training for function generation.
- [ ] Rename FormatEnum => Primitive?
- [ ] Don't re-export effect?

## Issues

- [ ] Build error when changing from TypedObject using Ref$: Type 'Task' does not satisfy the constraint 'WithId' (see echo-schema/testing/schema.ts)
- [ ] Reconcile all schema variants (Base, Immutable, TypedObject, EchoObject, etc.)
- [ ] Consolidate getters (getType, getSchema, getTypename, getSchemaTypename, etc.)
- [ ] ReactiveObject should specify id property? Reconcile AnyProperties, ReactiveObject, HasId, WithId, etc.
- [ ] Can we us S.is(MyType) to detect objects with our types system? (Branding?)
