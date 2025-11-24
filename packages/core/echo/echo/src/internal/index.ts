//
// Copyright 2024 DXOS.org
//

export * from './annotations';
export * from './entities';
export * from './formats';
export * from './json-schema';
export * from './ref';
export * from './types';

// TODO(burdon): Restrict access to internal.
//  1. Remove from outisde of @dxos/echo-db; promote toe echo/db types; serach: from '@dxos/echo/internal';
//  - [x] completely restructure @dxos/echo src/internal
//  - [x] Remove import "." and ".."! (create lint rule).
//  - [x] Unify FOUR different nests of test schema.
//  - [x] Remove @deprecated from internal methods and mark @internal (e.g., getSchemaDXN).
//    - NOTE: Internal methods should not use the import * from Obj/Type APIs.
//  - [x] import ObjectId => @dxos/keys
//  - [x] Entity type for Obj | Relation
//  - [x] import LabelAnnotation => Annotation.LabelAnnotation
//  - [x] import Expando => Type.Expando
//  - [x] live => Obj.make
//  - [x] Rename live => makeObject
//  - [x] Rename {EchoObject, EchoRelation} => {EchoObjecSchema, EchoRelationSchema}
//  - [x] Rename BaseObject => AnyProperties
//  - [x] Created Entity.Any (=> AnyEchoObject).
//  - [x] TypeFormat => TypeFormat
//  - [x] JsonSchemaType defs
//  - [ ] Fix commented out tests.
//  - [ ] DISCUSS: Standradize $ suffix to disambuguate imports (GPT recommended).
//
//  2. Clean-up
//  - [ ] Promote parts of src/internal/ref to Ref.ts
//  - [ ] Rename AnyEchoObject => AnyEntity? (or accept that Object != Obj from naming perspective.)
//  - [ ] Remove echo-db/AnyLiveObject<T> => Obj.Obj<T>
//  - [ ] Remove WithId => AnyEchoObject
//  - [ ] Remove WithMeta => AnyEchoObject
//  - [ ] HasId
//  - [ ] BaseSchema
//  - [ ] JsonPath, JsonProp, getValue, setValue => Json.Path?
//  - [ ] Move EchoSchemaRegistry into hypergraph
//
//  3. Audit usage from @dxos/echo-db
//  - [ ] QueryFn, QueryOptions => Database
//  - [ ] Datatbase.query() options?
//  - [ ] Expando type.
//  - [ ] Standardize '@automerge/automerge' imports (A vs. next).

export { makeObject } from './proxy';
export { type BaseSchema, EchoSchema, StoredSchema, ImmutableSchema, RuntimeSchemaRegistry, isMutable } from './schema';
export { type AnyProperties, type HasId } from './types';
export {
  createObject,
  createQueueDXN,
  isDeleted,
  objectFromJSON,
  objectToJSON,
  setRefResolverOnData,
  SchemaValidator,
  TypedObject,
} from './object';
