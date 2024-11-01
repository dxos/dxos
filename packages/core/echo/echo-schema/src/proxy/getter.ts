//
// Copyright 2024 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { type S } from '@dxos/effect';

import { getProxyHandler, isReactiveObject } from './proxy';
import { getObjectAnnotation } from '../ast';

/**
 * Returns the schema for the given object if one is defined.
 */
export const getSchema = <T extends {} = any>(obj: T | undefined): S.Schema<any> | undefined => {
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

export const isDeleted = <T extends {}>(obj: T): boolean => {
  return getProxyHandler(obj).isDeleted(obj) ?? false;
};

// TODO(burdon): Replace most uses with getTypename.
export const getType = <T extends {}>(obj: T | undefined): Reference | undefined => {
  if (obj == null) {
    return undefined;
  }
  if (isReactiveObject(obj)) {
    return getProxyHandler(obj).getTypeReference(obj);
  }

  return undefined;
};

export const getTypename = <T extends {}>(obj: T): string | undefined => getType(obj)?.objectId;

export const requireTypeReference = (schema: S.Schema<any>): Reference => {
  const typeReference = getTypeReference(schema);
  if (typeReference == null) {
    // TODO(burdon): Catalog user-facing errors (this is too verbose).
    throw new Error('Schema must have a valid annotation: MyTypeSchema.pipe(echoObject("MyType", "1.0.0"))');
  }

  return typeReference;
};
