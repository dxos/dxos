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
- [x] import Expando => @dxos/schema (Expando.Expando)
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
- [x] Expando moved to @dxos/schema
- [x] Narrow QueryResult and match Schema and Object generics.

2. Clean-up

- [x] QueryResult namespace
- [x] SchemaRegistry interface
- [x] Schema registry should return Type.Entity.Any instead of Schema.Schema.AnyNoContext.
- [x] Hypergraph interface
- [x] Obj.getDatabase
- [x] SpaceAction.AddObject target should be a db not a space.
- [x] Add Relation.MakeProps
- [x] Add Obj.Unknown and Relation.Unknown to match Entity.Unknown.
- [x] TODO(wittjosiah): Should be Type.obj<...> or equivalent.
- [x] TODO(wittjosiah): Find a simpler way to define this type.
- [x] Ref.Array.targets doesn't satisfy Obj.Any because it uses AnyEchoObject.
- [x] Remove echo-db/AnyLiveObject<T> => Obj.Obj<T>
- [x] Rename AnyEchoObject => AnyEntity
- [x] Remove WithId => AnyEntity
- [x] Remove WithMeta => AnyEntity
- [x] Obj.Any => Obj.Unknown
- [x] Relation.Any => Relation.Unknown
- [x] Ref.Any => Ref.Unknown
- [x] Obj.AnyProps => Obj.Any
- [x] Factor Expando out of @dxos/echo (moved to @dxos/schema)
- [x] Obj.instanceOf works with Expando (tested in @dxos/schema)
- [x] Obj.Snapshot should be same shape as Obj.Obj but with a different brand
- [x] Mutators should only work on object after it is made mutable

- [ ] Review usage of Obj.Any, see if it could be stricter
- [ ] Type.Obj should validate using the echo object brand
- [ ] Mutable could be a branded type to fix "NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`"
- [ ] space properties, queues, messagins preventing getSpace from being removed
- [ ] Schema registry should use Query.Query.
- [ ] Move EchoSchemaRegistry into hypergraph
- [ ] Narrow QueryResult and match Schema and Object generics.
- [ ] BaseSchema
- [ ] Directly import JSONPath, etc. from @dxos/effect.
- [ ] Promote parts of src/internal/ref to Ref.ts
- [ ] JsonPath, JsonProp, getValue, setValue => Json.Path?
- [ ] DISCUSS: Standradize $ suffix to disambuguate imports (GPT recommended).

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
- [ ] Type.Expando doesn't work with AtomQuery result type (have to use Obj.Any instead).
- [ ] Obj.Any doesn't work with Obj.change callback types (have to use `any` for the mutable parameter).
