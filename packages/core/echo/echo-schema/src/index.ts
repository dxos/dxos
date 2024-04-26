//
// Copyright 2024 DXOS.org
//

export * from './dynamic';
export * from './ast';
export * from './handler';
export * from './json';
export * from './proxy';
export * from './annotations';
export * from './expando';
export { isDeleted, getSchema, getType, getMeta, getTypeReference, requireTypeReference } from './getter';
export * from './typed-object-class';
export * from './types';
export * from './reference';
export { ref } from './ref-annotation';
export { defineHiddenProperty } from './utils';

export * as S from '@effect/schema/Schema';
export * as AST from '@effect/schema/AST';

// This comment is here to bust NX cache. Remove it after the code changes.
