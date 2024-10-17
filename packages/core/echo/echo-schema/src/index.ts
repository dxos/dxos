//
// Copyright 2024 DXOS.org
//

/**
 * Peer dependencies re-exported symbols that are effectively part of the ECHO API.
 */
export { AST, JSONSchema, S } from '@dxos/effect';

// TODO(burdon): Clean ./types.
// TODO(burdon): Consolidate proxies (object, proxy dirs).
// TODO(burdon): Organize json.
// TODO(burdon): Consistent Symbol.for names.

export * from './ast';
export * from './dynamic';
export * from './json';
export * from './handler';
export * from './object';
export * from './proxy';
export * from './types';
