//
// Copyright 2024 DXOS.org
//

export * from './expando';
export {
  type SchemaResolver,
  getSchema,
  getType,
  getTypename,
  getMeta,
  getTypeReference,
  isDeleted,
  requireTypeReference,
} from './getter';
export { createEchoReferenceSchema, ref } from './ref-annotation';
export * from './typed-object-class';
export * from './utils';
