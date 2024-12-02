//
// Copyright 2024 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { type S } from '@dxos/effect';

import { getProxyHandler, isReactiveObject } from './proxy';
import { getObjectAnnotation, SchemaMetaSymbol } from '../ast';
import type { BaseObject } from '../types';

/**
 * Returns the schema for the given object if one is defined.
 */
export const getSchema = <T extends BaseObject<T>>(obj: T | undefined): S.Schema<any> | undefined => {
  if (obj && isReactiveObject(obj)) {
    return getProxyHandler(obj).getSchema(obj);
  }

  return undefined;
};

export const getTypeReference = (schema: S.Schema<any> | undefined): Reference | undefined => {
  if (!schema) {
    return undefined;
  }

  const annotation = getObjectAnnotation(schema);
  if (annotation == null) {
    return undefined;
  }
  if (annotation.schemaId) {
    return new Reference(annotation.schemaId);
  }

  return Reference.fromLegacyTypename(annotation.typename);
};

export const isDeleted = <T extends BaseObject<T>>(obj: T): boolean => {
  return getProxyHandler(obj).isDeleted(obj) ?? false;
};

// TODO(burdon): Replace most uses with getTypename.
export const getType = <T extends BaseObject<T>>(obj: T | undefined): Reference | undefined => {
  if (obj == null) {
    return undefined;
  }
  if (isReactiveObject(obj)) {
    return getProxyHandler(obj).getTypeReference(obj);
  }

  return undefined;
};

// TODO(burdon): Reconcile functions.
export const getTypename = <T extends BaseObject<T>>(obj: T): string | undefined => {
  const schema = getSchema(obj);
  // Special handling for MutableSchema. objectId is StoredSchema objectId, not a typename.
  if (schema && typeof schema === 'object' && SchemaMetaSymbol in schema) {
    return (schema as any)[SchemaMetaSymbol].typename;
  }
  return getType(obj)?.objectId;
};
export const getTypenameOrThrow = (schema: S.Schema<any>): string => requireTypeReference(schema).objectId;

export const requireTypeReference = (schema: S.Schema<any>): Reference => {
  const typeReference = getTypeReference(schema);
  if (typeReference == null) {
    // TODO(burdon): Catalog user-facing errors (this is too verbose).
    throw new Error('Schema must be defined via TypedObject.');
  }

  return typeReference;
};
