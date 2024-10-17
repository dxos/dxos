//
// Copyright 2024 DXOS.org
//

/**
 * Peer dependencies re-exported symbols that are effectively part of the ECHO API.
 */
export { AST, JSONSchema, S } from '@dxos/effect';

// TODO(burdon): Clean-up ./types (remove import deps from this file).
// TODO(burdon): Organize subfolders to minimize cross-folder deps.
// TODO(burdon): Rename EchoReactiveObject (remove ECHO prefix).
// TODO(burdon): Consistent Symbol.for names.
// TODO(burdon): MutableSchema => MutableSchema.
// TODO(burdon): S.Schema<any> everywhere.

export * from './ast';
export * from './dynamic';
export * from './json';
export * from './handler';
export * from './object';
export * from './proxy';
export * from './types';
