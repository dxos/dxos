//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { type BaseObject, type ForeignKey, type ReactiveObject, getMeta, getProxyTarget } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { type ReactiveEchoObject, isEchoObject } from './create';
import { symbolInternals, type ProxyTarget } from './echo-proxy-target';
import { type EchoDatabase } from '../proxy-db';

export const getDatabaseFromObject = (obj: ReactiveObject<any>): EchoDatabase | undefined => {
  if (!isEchoObject(obj)) {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const target = getProxyTarget(obj) as ProxyTarget;
  return target[symbolInternals].database;
};

export const getReferenceWithSpaceKey = (obj: ReactiveEchoObject<any>): Reference | undefined => {
  invariant(obj);
  const db = getDatabaseFromObject(obj);
  return db && new Reference(obj.id, undefined, db.spaceKey.toHex());
};

// TODO(burdon): Factor out.
// TODO(burdon): Impl query by meta.
export const findObjectWithForeignKey = <T extends BaseObject>(
  objects: ReactiveEchoObject<T>[],
  foreignKey: ForeignKey,
) => {
  return objects.find((result) => {
    return getMeta(result).keys.find(({ source, id }) => source === foreignKey.source && id === foreignKey.id);
  });
};

export const matchKeys = (a: ForeignKey[], b: ForeignKey[]): boolean => {
  return a.some((keyA) => b.some((keyB) => keyA.source === keyB.source && keyA.id === keyB.id));
};
