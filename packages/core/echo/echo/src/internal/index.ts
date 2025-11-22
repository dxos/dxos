//
// Copyright 2024 DXOS.org
//

export * from './ast';
export * from './entities';
export * from './formats';
export * from './json-schema';
export * from './ref';
export * from './types';

// TODO(burdon): Restrict access to internal.
//  1. Remove from outisde of echo-db; promote toe echo/db types; serach: from '@dxos/echo/internal';
//    live => @dxos/live-object
//    - [x] Annotation

//    - [ ] JsonSchema defs
//    - [ ] FormatEnum => TypeFormat
//    - [ ] JsonPath, JsonProp, getValue, setValue
//    - [ ] HasId
//    - [ ] Expando => Type.Expando
//    - [ ] AnyEchoObject
//    - [ ] BaseSchema

//  2. Audit usage from @dxos/echo-db

export { live } from './proxy';
export { type BaseSchema, EchoSchema, ImmutableSchema, RuntimeSchemaRegistry, isMutable } from './schema';
export { type BaseObject, type HasId } from './types';
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
