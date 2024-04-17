//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/echo-db';

import { type ForeignKey } from './types';
import type { EchoDatabase } from '../database';
import type * as echoHandlerModule from '../effect/echo-handler';
import { getProxyHandlerSlot } from '../effect/proxy';
import { isEchoReactiveObject, type EchoReactiveObject } from '../effect/reactive';

export const getDatabaseFromObject = (obj: EchoReactiveObject<any>): EchoDatabase | undefined => {
  if (isEchoReactiveObject(obj)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getObjectCoreFromEchoTarget }: typeof echoHandlerModule = require('../effect/echo-handler');
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
