//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import {
  type ForeignKey,
  type EchoReactiveObject,
  type ReactiveObject,
  getProxyHandlerSlot,
  getMeta,
} from '@dxos/echo-schema';

import { isEchoObject } from './create';
import { symbolInternals, type ProxyTarget } from './echo-proxy-target';
import type { EchoDatabase } from '../database';

export const getDatabaseFromObject = (obj: ReactiveObject<any>): EchoDatabase | undefined => {
  if (isEchoObject(obj)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const target = getProxyHandlerSlot(obj).target as ProxyTarget;
    return target[symbolInternals].database;
  }
  return undefined;
};

export const getReferenceWithSpaceKey = (obj: EchoReactiveObject<any>): Reference | undefined => {
  const db = getDatabaseFromObject(obj);
  return db && new Reference(obj.id, undefined, db.spaceKey.toHex());
};

// TODO(burdon): Factor out.
// TODO(burdon): Impl query by meta.
export const findObjectWithForeignKey = <T>(objects: EchoReactiveObject<T>[], foreignKey: ForeignKey) => {
  return objects.find((result) => {
    return getMeta(result).keys.find(({ source, id }) => source === foreignKey.source && id === foreignKey.id);
  });
};

export const matchKeys = (a: ForeignKey[], b: ForeignKey[]): boolean => {
  return a.some((keyA) => b.some((keyB) => keyA.source === keyB.source && keyA.id === keyB.id));
};
