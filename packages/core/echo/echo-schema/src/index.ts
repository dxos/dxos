//
// Copyright 2024 DXOS.org
//

/**
 * Peer dependencies re-exported symbols that are effectively part of the ECHO API.
 */
export { AST, JSONSchema, S } from '@dxos/effect';

// TODO(burdon): Clean ./types.
// TODO(burdon): Organize json.
// TODO(burdon): Check symbol names.

export * from './ast';
export * from './dynamic';
export * from './handler';
export * from './json';
export * from './proxy';
export * from './types';
