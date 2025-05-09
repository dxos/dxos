//
// Copyright 2024 DXOS.org
//

import { type BaseObject, foreignKeyEquals, getObjectMeta, type ObjectMeta, Ref } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type Comparator, deepMapValues, intersection } from '@dxos/util';

import type { Live } from './live';

// TODO(dmaretskyi): Combine with `getObjectMeta`.
export const getMeta = <T extends BaseObject>(obj: T): ObjectMeta => {
  const meta = getObjectMeta(obj);
  invariant(meta);
  return meta;
};

// TODO(dmaretskyi): Move to echo-schema.
export const compareForeignKeys: Comparator<Live<any>> = (a: Live<any>, b: Live<any>) =>
  intersection(getMeta(a).keys, getMeta(b).keys, foreignKeyEquals).length > 0;

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
