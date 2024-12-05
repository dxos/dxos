//
// Copyright 2024 DXOS.org
//

import { type BaseObject, foreignKeyEquals, type ObjectMeta } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type Comparator, intersection } from '@dxos/util';

import type { ReactiveObject } from './object';
import { getProxyHandler } from './proxy';

export const getMeta = <T extends BaseObject>(obj: T): ObjectMeta => {
  const meta = getProxyHandler(obj).getMeta(obj);
  invariant(meta);
  return meta;
};

export const compareForeignKeys: Comparator<ReactiveObject<any>> = (a: ReactiveObject<any>, b: ReactiveObject<any>) =>
  intersection(getMeta(a).keys, getMeta(b).keys, foreignKeyEquals).length > 0;
