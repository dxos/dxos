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
//  - [x] Remove import "." and ".."! (MUST CREATE LINT RULE).
//  - [x] Unify FOUR different nests of test schema.
//  - [x] Remove @deprecated from internal methods and mark @internal (e.g., getSchemaDXN).
//      (Internal methods should not use the Obj/Type APIs.)
//  - [x] import ObjectId => @dxos/keys
//  - [x] import LabelAnnotation => Annotation.LabelAnnotation
//  - [x] import Expando => Type.Expando
//  - [x] live => Obj.make
//  - [x] Rename live => makeObject
//  - [x] Rename {EchoObject, EchoRelation} => {EchoObjecSchema, EchoRelationSchema}
//  - [x] Rename BaseObject => AnyProperties
//  - [x] Created Entity.Any (=> AnyEchoObject).

//  - [ ] Rename AnyEchoObject => AnyEntity?
//  - [ ] Remove echo-db/AnyLiveObject<T> => Obj.Obj<T>
//  - [ ] Promote parts of src/internal/ref to Ref.ts

//  - [ ] Remove WithId => AnyEchoObject
//  - [ ] Remove WithMeta => AnyEchoObject

//  - [ ] HasId
//  - [ ] BaseSchema
//  - [ ] QueryFn, QueryOptions => Database
//  - [ ] JsonSchema defs
//  - [ ] FormatEnum => TypeFormat
//  - [ ] JsonPath, JsonProp, getValue, setValue => Json.Path?
//  - [ ] Standardize '@automerge/automerge' imports.

//  - Datatbase.query() options?

//  2. Audit usage from @dxos/echo-db

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
