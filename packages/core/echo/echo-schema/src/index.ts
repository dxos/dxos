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
export * from './mutable/manipulation';
export * from './mutable/mutable-schema';
export * from './mutable/runtime-schema-registry';
export * from './mutable/stored-schema';
export * from './mutable/types';
export * from './object';
export * from './query';
export * from './types';
export * from './utils';
