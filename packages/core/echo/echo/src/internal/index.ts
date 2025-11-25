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

// TODO(wittjosiah): Required to ensure types are portable (need to export all types required for downstream inference).
export * from './object';
export * from './proxy';
export * from './schema';

// export {
//   createObject,
//   createQueueDXN,
//   isDeleted,
//   objectFromJSON,
//   objectToJSON,
//   setRefResolverOnData,
//   SchemaValidator,
//   TypedObject,
// } from './object';
// export { makeObject } from './proxy';
// export {
//   type BaseSchema,
//   EchoSchema,
//   ImmutableSchema,
//   RuntimeSchemaRegistry,
//   PersistentSchema,
//   isMutable,
// } from './schema';
