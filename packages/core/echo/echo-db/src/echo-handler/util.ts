//
// Copyright 2023 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { type ForeignKey } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';
import { type Live, getProxyTarget } from '@dxos/live-object';

import { type EchoDatabase } from '../proxy-db';

import { type AnyLiveObject, isEchoObject } from './echo-handler';
import { type ProxyTarget, symbolInternals } from './echo-proxy-target';

export const getDatabaseFromObject = (obj: Live<any>): EchoDatabase | undefined => {
  if (!isEchoObject(obj)) {
    return undefined;
  }

  const target = getProxyTarget(obj) as ProxyTarget;
  return target[symbolInternals].database;
};

/**
 * @deprecated Use `DXN.fromSpaceAndObjectId(spaceId, obj.id)` instead.
 */
export const getDXNWithSpaceKey = (obj: AnyLiveObject<any>): DXN | undefined => {
  const db = getDatabaseFromObject(obj);
  return db && DXN.fromSpaceAndObjectId(db.spaceId, obj.id);
};

// TODO(burdon): Factor out.
// TODO(burdon): Impl query by meta.
export const findObjectWithForeignKey = <T extends AnyProperties>(
  objects: AnyLiveObject<T>[],
  foreignKey: ForeignKey,
) => {
  return objects.find((result) => {
    return Obj.getMeta(result).keys.find(({ source, id }) => source === foreignKey.source && id === foreignKey.id);
  });
};

export const matchKeys = (a: ForeignKey[], b: ForeignKey[]): boolean => {
  return a.some((keyA) => b.some((keyB) => keyA.source === keyB.source && keyA.id === keyB.id));
};
