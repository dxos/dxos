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
//  1. Remove from outisde of echo-db; promote toe echo/db types; serach: from '@dxos/echo/internal';
//  - [x] import ObjectId => @dxos/keys
//  - [x] import LabelAnnotation => Annotation.LabelAnnotation
//  - [x] import Expando => Type.Expando
//  - [x] live => Obj.make
//  - [x] Rename live => createLiveObject
//  - [x] Rename {EchoObject, EchoRelation} => {EchoObjecSchema, EchoRelationSchema}
//  - [x] Rename BaseObject => AnyProperties
//  - [x] Created Entity.Any (=> AnyEchoObject).
//  - [x] Remove import "." and ".."! (MUST CREATE LINT RULE).
//    - [ ] Rename AnyEchoObject => AnyEntity?
//  - [ ] Remove @deprecated from internal methods and mark @internal (e.g., getSchemaDXN).
//    (Internal methods should not use the Obj/Type APIs.)

//  - [ ] Remove echo-db/AnyLiveObject<T> => Obj.Obj<T>

//  - [ ] Remove WithId => AnyEchoObject
//  - [ ] Remove WithMeta => AnyEchoObject

//  - [ ] HasId
//  - [ ] BaseSchema
//  - [ ] QueryFn, QueryOptions => Database
//  - [ ] JsonSchema defs
//  - [ ] FormatEnum => TypeFormat
//  - [ ] JsonPath, JsonProp, getValue, setValue => Json.Path?

//  - Datatbase.query() options?

//  2. Audit usage from @dxos/echo-db
//  3. Reconcile THREE (FFS) variants of testing data.

export { createLiveObject } from './proxy';
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
