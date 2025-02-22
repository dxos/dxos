//
// Copyright 2024 DXOS.org
//

import { type Reference } from '@dxos/echo-protocol';
import type { BaseObject, JsonPath } from '@dxos/echo-schema';
import { SchemaMetaSymbol } from '@dxos/echo-schema';
import { findAnnotation, visit, VisitResult, type S } from '@dxos/effect';

import { getProxyHandler, isReactiveObject } from './proxy';

/**
 * Returns the schema for the given object if one is defined.
 */
export const getSchema = <T extends BaseObject>(obj: T | undefined): S.Schema<any> | undefined => {
  if (obj && isReactiveObject(obj)) {
    return getProxyHandler(obj).getSchema(obj);
  }

  return undefined;
};

export const isDeleted = <T extends BaseObject>(obj: T): boolean => {
  return getProxyHandler(obj).isDeleted(obj) ?? false;
};

// TODO(burdon): Replace most uses with getTypename.
export const getType = <T extends BaseObject>(obj: T | undefined): Reference | undefined => {
  if (obj == null) {
    return undefined;
  }
  if (isReactiveObject(obj)) {
    return getProxyHandler(obj).getTypeReference(obj);
  }

  return undefined;
};

// TODO(burdon): Reconcile functions.
export const getTypename = <T extends BaseObject>(obj: T): string | undefined => {
  const schema = getSchema(obj);
  // Special handling for EchoSchema. objectId is StoredSchema objectId, not a typename.
  if (schema && typeof schema === 'object' && SchemaMetaSymbol in schema) {
    return (schema as any)[SchemaMetaSymbol].typename;
  }
  return getType(obj)?.objectId;
};

export const PropertyValenceAnnotationId = Symbol.for('@dxos/schema/annotation/PropertyValence');
export type Valence = 'primary' | 'secondary' | (string & {});

export const getValencePropertyOf = <T extends BaseObject>(object: T, valence: Valence): JsonPath | undefined => {
  const schema = getSchema(object);
  if (!schema) {
    return undefined;
  }

  let result: string | undefined;

  visit(schema.ast, (node, path) => {
    const nodeValence = findAnnotation<Valence>(node, PropertyValenceAnnotationId);
    if (nodeValence === valence) {
      result = path.join('.');
      return VisitResult.EXIT;
    }
  });

  return result as JsonPath;
};
