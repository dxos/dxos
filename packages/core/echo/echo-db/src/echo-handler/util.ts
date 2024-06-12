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
import type { EchoDatabase } from '../proxy-db';

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
  return db && new Reference(getObjectDXN(obj));
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

/**
 * Object DXN is a fully qualified name that can be used to lookup an object.
 *
 * It is a combination of the space id and objet id.
 */
export const getObjectDXN = (object: ReactiveObject<any>): DXN => {
  const database = getDatabaseFromObject(object);
  if (!database) {
    throw new Error('Object must be saved to a space to be addressable');
  }
  return new DXN(DXN.kind.ECHO, [database.spaceId, object.id]);
};
