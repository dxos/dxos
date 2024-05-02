//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { type ForeignKey, type EchoReactiveObject, type ReactiveObject, getProxyHandlerSlot } from '@dxos/echo-schema';

import { isEchoObject } from './create';
import { getObjectCoreFromEchoTarget } from './echo-handler';
import type { EchoDatabase } from '../database';

export const getDatabaseFromObject = (obj: ReactiveObject<any>): EchoDatabase | undefined => {
  if (isEchoObject(obj)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = getObjectCoreFromEchoTarget(getProxyHandlerSlot(obj).target as any);
    return core?.database?._dbApi;
  }
  return undefined;
};

export const getReferenceWithSpaceKey = (obj: EchoReactiveObject<any>): Reference | undefined => {
  const db = getDatabaseFromObject(obj);
  return db && new Reference(obj.id, undefined, db.spaceKey.toHex());
};

export const matchKeys = (a: ForeignKey[], b: ForeignKey[]): boolean => {
  return a.some((keyA) => b.some((keyB) => keyA.source === keyB.source && keyA.id === keyB.id));
};
