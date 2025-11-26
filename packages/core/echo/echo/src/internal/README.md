## Refactor

1. Remove access from outisde of @dxos/echo-db

- [x] completely restructure @dxos/echo src/internal
- [x] Remove import "." and ".."! (create lint rule).
- [x] Unify FOUR different nests of test schema.
- [x] Remove @deprecated from internal methods and mark @internal (e.g., getSchemaDXN).
  - NOTE: Internal methods should not use the import \* from Obj/Type APIs.
- [x] import ObjectId => @dxos/keys
- [x] Entity.Any = Obj.Any | Relation.Any
  - NOTE: Relation does not extend (in not polymorphic with) Obj.
- [x] import LabelAnnotation => Annotation.LabelAnnotation
- [x] import Expando => Type.Expando
- [x] live => Obj.make
- [x] Rename live => makeObject
- [x] Rename {EchoObject, EchoRelation} => {EchoObjecSchema, EchoRelationSchema}
- [x] Rename AnyProperties => AnyProperties
- [x] Created Entity.Any (=> AnyEchoObject).
- [x] TypeFormat => TypeFormat
- [x] JsonSchemaType defs
- [x] Fix database.add() input/output types and search for "Obj.Any = db.add" (also QueryResult types).
- [x] TODO(burdon): FIX!!!
- [x] Fix failing tests.
- [x] Reconcile types/version with entities/model/version
- [x] Type.Expando => Obj.Any

2. Clean-up

- [ ] TODO(wittjosiah): Find a simpler way to define this type.
- [ ] TODO(wittjosiah): Should be Type.obj<...> or equivalent.
- [ ] Ref.Array.targets doesn't satisfy Obj.Any because it uses AnyEchoObject.
- [ ] Add Relation.MakeProps
- [ ] Schema registry should return Type.Entity.Any instead of Schema.Schema.AnyNoContext.
- [ ] Remove echo-db/AnyLiveObject<T> => Obj.Obj<T>
- [ ] Narrow QueryResult and match Schema and Object generics.
- [ ] Directly import JSONPath, etc. from @dxos/effect.
- [ ] DISCUSS: Standradize $ suffix to disambuguate imports (GPT recommended).
- [ ] Reconcile Type.Ref with Ref.Ref
- [ ] Promote parts of src/internal/ref to Ref.ts
- [ ] Rename AnyEchoObject => AnyEntity? (or accept that Object != Obj from naming perspective.)
- [ ] Remove WithId => AnyEchoObject
- [ ] Remove WithMeta => AnyEchoObject
- [ ] BaseSchema
- [ ] JsonPath, JsonProp, getValue, setValue => Json.Path?
- [ ] Move EchoSchemaRegistry into hypergraph

3. Audit usage from @dxos/echo-db

- [ ] Ability to extract Struct from Type.Obj
- [ ] created/updated system props (const { created } = Obj.getTimestamps)?
- [ ] QueryFn, QueryOptions => Database
- [ ] Datatbase.query() options?
- [ ] Expando type is used as a fallback in many plance.
- [ ] Standardize '@automerge/automerge' imports (A vs. next).

## NOTES

- Marking types as @internal (even for unexported types) erases type information.

## 0.9.0

- [ ] Database, Queue, Space, Type, namespaces.
- [ ] Support class variant for types.
- [ ] Support defaults.
- [ ] Support effect Date, Timestamp formats.
- [ ] Metadata for created, updated timestamps.
- [ ] Effect team design review.
- [ ] @category annotations to group types in the API.
- [ ] TSdoc and LLM training for function generation.
- [ ] Rename TypeFormat => Primitive?
- [ ] Don't re-export effect?

## Issues

- [ ] Build error when changing from TypedObject using Ref$: Type 'Task' does not satisfy the constraint 'WithId' (see echo-schema/testing/schema.ts)
- [ ] Reconcile all schema variants (Base, Immutable, TypedObject, EchoObject, etc.)
- [ ] Consolidate getters (getType, getSchema, getTypename, getSchemaTypename, etc.)
- [ ] ReactiveObject should specify id property? Reconcile AnyProperties, ReactiveObject, HasId, WithId, etc.
- [ ] Can we us S.is(MyType) to detect objects with our types system? (Branding?)
