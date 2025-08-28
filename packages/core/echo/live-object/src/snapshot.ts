//
// Copyright 2024 DXOS.org
//

import { type BaseObject, Ref } from '@dxos/echo/internal';
import { deepMapValues } from '@dxos/util';

import type { Live } from './live';

/**
 * Returns an immutable snapshot of the live object.
 */
export const getSnapshot = <T extends BaseObject>(obj: Live<T>): T => {
  return deepMapValues(obj, (value, recurse) => {
    // Do not recurse on references.
    if (Ref.isRef(value)) {
      return { '/': value.dxn.toString() };
    }

    return recurse(value);
  });
};
