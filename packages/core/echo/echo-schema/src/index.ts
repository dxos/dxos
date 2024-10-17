//
// Copyright 2024 DXOS.org
//

/**
 * Peer dependencies re-exported symbols that are effectively part of the ECHO API.
 */
export { AST, JSONSchema, S } from '@dxos/effect';

export * from './ast';
export * from './dynamic';
export * from './expando';
export { getSchema, getType, getTypename, getMeta, getTypeReference, isDeleted, requireTypeReference } from './getter';
export * from './handler';
export * from './json';
export * from './proxy';
export { ref } from './ref-annotation';
export * from './typed-object-class';
export * from './types';
export { defineHiddenProperty } from './utils';
