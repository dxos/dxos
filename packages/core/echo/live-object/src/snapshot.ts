//
// Copyright 2024 DXOS.org
//

import { deepMapValues } from '@dxos/util';

import type { Live } from './live';

/**
 * Returns an immutable snapshot of the live object.
 */
export const getSnapshot = <T extends object>(obj: Live<T>): T => {
  return deepMapValues(obj, (value, recurse) => {
    // Do not recurse on references.
    if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) !== Object.prototype) {
      return value;
    }

    return recurse(value);
  });
};
