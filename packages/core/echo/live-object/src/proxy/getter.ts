//
// Copyright 2024 DXOS.org
//

import { type Reference } from '@dxos/echo-protocol';
import type { BaseObject } from '@dxos/echo-schema';
import { getSchema, SchemaMetaSymbol } from '@dxos/echo-schema';

import { getProxyHandler, isReactiveObject } from './proxy';

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

// TODO(burdon): Move to echo-schema.
export const getTypename = <T extends BaseObject>(obj: T): string | undefined => {
  const schema = getSchema(obj);
  // Special handling for EchoSchema. objectId is StoredSchema objectId, not a typename.
  if (schema && typeof schema === 'object' && SchemaMetaSymbol in schema) {
    return (schema as any)[SchemaMetaSymbol].typename;
  }
  return getType(obj)?.objectId;
};
