## Refactor

1. Remove from outisde of @dxos/echo-db; promote toe echo/db types; serach: from '@dxos/echo/internal';

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
- [ ] Narrow QueryResult and match Schema and Object generics.
- [ ] Reconcile Type.Ref with Ref.Ref
- [ ] Fix commented out tests.
- [ ] Narrow Database, Query generic types.
- [ ] DISCUSS: Standradize $ suffix to disambuguate imports (GPT recommended).

2. Clean-up

- [ ] Restrict import { X } from '@dxos/echo/internal' TODO(burdon): Only for echo-db.
- [ ] Promote parts of src/internal/ref to Ref.ts
- [ ] Rename AnyEchoObject => AnyEntity? (or accept that Object != Obj from naming perspective.)
- [ ] Remove echo-db/AnyLiveObject<T> => Obj.Obj<T>
- [ ] Remove WithId => AnyEchoObject
- [ ] Remove WithMeta => AnyEchoObject
- [ ] HasId
- [ ] BaseSchema
- [ ] JsonPath, JsonProp, getValue, setValue => Json.Path?
- [ ] Move EchoSchemaRegistry into hypergraph

3. Audit usage from @dxos/echo-db

- [ ] created/updated system props (const { created } = Obj.getTimestamps)?
- [ ] QueryFn, QueryOptions => Database
- [ ] Datatbase.query() options?
- [ ] Expando type is used as a fallback in many plance.
- [ ] Standardize '@automerge/automerge' imports (A vs. next).

## NOTES

- Marking types as @internal (even for unexported types) erases type information.
