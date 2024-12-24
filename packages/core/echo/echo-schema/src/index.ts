//
// Copyright 2024 DXOS.org
//

/**
 * Peer dependencies re-exported symbols that are effectively part of the ECHO API.
 */
export { AST, JSONSchema, Schema as S } from '@effect/schema';

export { JsonPath, JsonProp } from '@dxos/effect';

export * from './ast';
// TODO(dmaretskyi): Omitting barrel export in the mutable directory due to circular deps.
export * from './ast/ref';
export * from './formats';
export * from './json';

// TODO(dmaretskyi): Omitting barrel export in the mutable directory due to circular deps.
export * from './schema/manipulation';
export * from './schema/echo-schema';
export * from './schema/runtime-schema-registry';
export * from './schema/stored-schema';
export * from './object';
export * from './query';
export * from './types';
export * from './utils';
