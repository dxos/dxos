//
// Copyright 2024 DXOS.org
//

/**
 * Peer dependencies re-exported symbols that are effectively part of the ECHO API.
 */
export { SchemaAST as AST, JSONSchema, Schema as S } from 'effect';

export { JsonPath, splitJsonPath, JsonProp } from '@dxos/effect';

export * from './ast';
export * from './formats';
export * from './json';

// TODO(dmaretskyi): Omitting barrel export in the mutable directory due to circular deps.
export * from './schema/manipulation';
export * from './schema/echo-schema';
export * from './schema/runtime-schema-registry';
export * from './schema/snapshot';
export * from './schema/stored-schema';

export * from './object';
export * from './query';
export * from './types';
export * from './utils';
