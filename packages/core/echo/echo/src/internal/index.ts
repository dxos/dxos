//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Import directly (not part of ECHO API).
export { JsonPath, JsonProp, getValue, setValue, splitJsonPath } from '@dxos/effect';

export * from './annotations';
export * from './entities';
export * from './formats';
export * from './json-schema';
export * from './ref';
export * from './types';

// TODO(burdon): Required to defeat moon cache (otherwise SchemaValidator is not found despite being exported below).
export * from './object';
export * from './proxy';
export * from './schema';

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
export { makeObject } from './proxy';
export { type BaseSchema, EchoSchema, ImmutableSchema, RuntimeSchemaRegistry, StoredSchema, isMutable } from './schema';
