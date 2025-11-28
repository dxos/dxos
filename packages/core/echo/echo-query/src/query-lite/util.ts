//
// Copyright 2025 DXOS.org
//

import { type Ref } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';

export const RefTypeId: unique symbol = Symbol('@dxos/echo-query/Ref');
export const isRef = (obj: any): obj is Ref.Ref<any> => {
  return obj && typeof obj === 'object' && RefTypeId in obj;
};

export const makeTypeDxn = (typename: string) => {
  assertArgument(typeof typename === 'string', 'typename');
  assertArgument(!typename.startsWith('dxn:'), 'typename');
  return `dxn:type:${typename}`;
};
