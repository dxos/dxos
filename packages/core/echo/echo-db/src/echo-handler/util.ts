//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { type BaseObject, type ForeignKey } from '@dxos/echo-schema';
import { getMeta } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { getProxyTarget, type Live } from '@dxos/live-object';

import { isEchoObject, type AnyLiveObject } from './echo-handler';
import { symbolInternals, type ProxyTarget } from './echo-proxy-target';
import { type EchoDatabase } from '../proxy-db';

export const getDatabaseFromObject = (obj: Live<any>): EchoDatabase | undefined => {
  if (!isEchoObject(obj)) {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
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
export const findObjectWithForeignKey = <T extends BaseObject>(objects: AnyLiveObject<T>[], foreignKey: ForeignKey) => {
  return objects.find((result) => {
    return getMeta(result).keys.find(({ source, id }) => source === foreignKey.source && id === foreignKey.id);
  });
};

export const matchKeys = (a: ForeignKey[], b: ForeignKey[]): boolean => {
  return a.some((keyA) => b.some((keyB) => keyA.source === keyB.source && keyA.id === keyB.id));
};
