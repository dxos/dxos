//
// Copyright 2024 DXOS.org
//

import { type Live } from './live';
import { createProxy, isValidProxyTarget } from './proxy';
import { UntypedReactiveHandler } from './untyped-handler';

/**
 * Creates a reactive object from a plain Javascript object.
 */
// TODO(dmaretskyi): Could mutate original object making it unusable.
// NOTE: Use Obj.make for creating typed objects.
export const live: {
  <T extends object>(obj: T): Live<T>;
} = <T extends object>(obj?: T): Live<T> => {
  if (!isValidProxyTarget(obj)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  return createProxy<T>(obj, UntypedReactiveHandler.instance);
};
