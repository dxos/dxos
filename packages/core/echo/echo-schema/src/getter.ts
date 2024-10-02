//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { Reference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import { getEchoObjectAnnotation } from './ast';
import { getProxyHandlerSlot, isReactiveObject } from './proxy';
import { type ObjectMeta } from './types';

/**
 * Returns the schema for the given object if one is defined.
 */
export const getSchema = <T extends {} = any>(obj: T | undefined): S.Schema<any> | undefined => {
  if (obj == null) {
    return undefined;
  }
  if (isReactiveObject(obj)) {
    const proxyHandlerSlot = getProxyHandlerSlot(obj);
    return proxyHandlerSlot.handler?.getSchema(obj);
  }

  return undefined;
};

export const getTypeReference = (schema: S.Schema.All | undefined): Reference | undefined => {
  if (!schema) {
    return undefined;
  }
  const annotation = getEchoObjectAnnotation(schema);
  if (annotation == null) {
    return undefined;
  }
  if (annotation.schemaId) {
    return new Reference(annotation.schemaId);
  }

  return Reference.fromLegacyTypename(annotation.typename);
};

export const getMeta = <T extends {}>(obj: T): ObjectMeta => {
  const proxyHandlerSlot = getProxyHandlerSlot(obj);
  const meta = proxyHandlerSlot.handler?.getMeta(obj);
  invariant(meta);
  return meta;
};

export const isDeleted = <T extends {}>(obj: T): boolean => {
  const proxyHandlerSlot = getProxyHandlerSlot(obj);
  return proxyHandlerSlot.handler?.isDeleted(obj) ?? false;
};

// TODO(burdon): Replace most uses with getTypename.
export const getType = <T extends {}>(obj: T | undefined): Reference | undefined => {
  if (obj == null) {
    return undefined;
  }

  if (isReactiveObject(obj)) {
    const proxyHandlerSlot = getProxyHandlerSlot(obj);
    return proxyHandlerSlot.handler?.getTypeReference(obj);
  }

  return undefined;
};

// TODO(burdon): AbstractTypedObject?
export const getTypename = <T extends {}>(obj: T): string | undefined => getType(obj)?.objectId;

export const requireTypeReference = (schema: S.Schema.All): Reference => {
  const typeReference = getTypeReference(schema);
  if (typeReference == null) {
    // TODO(burdon): Catalog user-facing errors (this is too verbose).
    throw new Error('Schema must have a valid annotation: MyTypeSchema.pipe(echoObject("MyType", "1.0.0"))');
  }

  return typeReference;
};
