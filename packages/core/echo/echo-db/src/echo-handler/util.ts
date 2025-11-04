//
// Copyright 2023 DXOS.org
//

import { type BaseObject, type ForeignKey } from '@dxos/echo/internal';
import { getMeta } from '@dxos/echo/internal';
import { Reference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type Live, getProxyTarget } from '@dxos/live-object';

import { type EchoDatabase } from '../proxy-db';

import { type AnyLiveObject, isEchoObject } from './echo-handler';
import { type ProxyTarget, symbolInternals } from './echo-proxy-target';

export const getDatabaseFromObject = (obj: Live<any>): EchoDatabase | undefined => {
  if (!isEchoObject(obj)) {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const target = getProxyTarget(obj) as ProxyTarget;
  return target[symbolInternals].database;
};

/**
 * @deprecated
 */
export const getReferenceWithSpaceKey = (obj: AnyLiveObject<any>): Reference | undefined => {
  invariant(obj);
  const db = getDatabaseFromObject(obj);
  return db && Reference.fromObjectIdAndSpaceKey(obj.id, db.spaceKey);
};

// TODO(burdon): Factor out.
// TODO(burdon): Impl query by meta.
export const findObjectWithForeignKey = <T extends BaseObject>(objects: AnyLiveObject<T>[], foreignKey: ForeignKey) =>
  objects.find((result) =>
    getMeta(result).keys.find(({ source, id }) => source === foreignKey.source && id === foreignKey.id),
  );

export const matchKeys = (a: ForeignKey[], b: ForeignKey[]): boolean =>
  a.some((keyA) => b.some((keyB) => keyA.source === keyB.source && keyA.id === keyB.id));
