//
// Copyright 2024 DXOS.org
//

export * from './ast';
export * from './dynamic';
export * from './expando';
export { isDeleted, getSchema, getType, getTypename, getMeta, getTypeReference, requireTypeReference } from './getter';
export * from './handler';
export * from './json';
export * from './proxy';
export { ref } from './ref-annotation';
export * from './typed-object-class';
export * from './types';
export { defineHiddenProperty } from './utils';
