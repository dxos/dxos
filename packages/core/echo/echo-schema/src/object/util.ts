//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/echo-db';

import { type ForeignKey } from './types';
import type { EchoDatabase } from '../database';
import { isEchoObject, getProxyHandlerSlot } from '../effect';
import { type EchoReactiveObject, type ReactiveObject } from '../effect';
import { getObjectCoreFromEchoTarget } from '../effect/echo/echo-handler';

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
