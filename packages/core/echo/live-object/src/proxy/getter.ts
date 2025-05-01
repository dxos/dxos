//
// Copyright 2024 DXOS.org
//

import { type Reference } from '@dxos/echo-protocol';
import { type BaseObject } from '@dxos/echo-schema';
import { getSchema, SchemaMetaSymbol } from '@dxos/echo-schema';

import { getProxyHandler } from './proxy';
import { isLiveObject } from '../live';

// TODO(dmaretskyi): Change to isDeleted symbol property
// TODO(dmaretskyi): Move to `@dxos/echo-schema`
export const isDeleted = <T extends BaseObject>(obj: T): boolean => {
  return getProxyHandler(obj).isDeleted(obj) ?? false;
};

/**
 * @deprecated Use `getTypename` instead.
 */
// TODO(burdon): Can we remove this?
// TODO(dmaretskyi): Remove
export const getType = <T extends BaseObject>(obj: T | undefined): Reference | undefined => {
  if (obj && isLiveObject(obj)) {
    return getProxyHandler(obj).getTypeReference(obj);
  }

  return undefined;
};
