//
// Copyright 2024 DXOS.org
//

/**
 * Peer dependencies re-exported symbols that are effectively part of the ECHO API.
 */
export { AST, JSONSchema, S } from '@dxos/effect';

// TODO(burdon): Tech debt:
//  - Clean-up ./types (remove import deps from this file).
//  - Change TypedObject to piped effector (not base class).
//  - Organize subfolders to minimize cross-folder deps.
//  - Rename EchoReactiveObject (remove ECHO prefix).
//  - Consistent Symbol.for names.
//  - S.Schema<HasId> everywhere?
//  - Fix defaults.

export * from './ast';
export * from './formats';
export * from './handler';
export * from './json';
export * from './mutable';
export * from './object';
export * from './proxy';
export * from './types';
