//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/echo-db';
import { type ObjectSnapshot } from '@dxos/protocols/proto/dxos/echo/model/document';
import { type TextSnapshot } from '@dxos/protocols/proto/dxos/echo/model/text';

import { type AbstractEchoObject } from './object';
import { isAutomergeObject } from './typed-object';
import { base, type OpaqueEchoObject, type EchoObject, type ForeignKey } from './types';
import type { EchoDatabase } from '../database';
import { type EchoReactiveHandlerImpl } from '../effect/echo-handler';
import { getProxyHandlerSlot } from '../effect/proxy';
import { isEchoReactiveObject } from '../effect/reactive';

export const setStateFromSnapshot = (obj: AbstractEchoObject, snapshot: ObjectSnapshot | TextSnapshot) => {
  throw new Error('Not implemented');
};

export const forceUpdate = (obj: AbstractEchoObject) => {
  obj[base]._itemUpdate();
};

export const getDatabaseFromObject = (obj: OpaqueEchoObject): EchoDatabase | undefined => {
  if (isAutomergeObject(obj)) {
    return obj[base]._core.database?._dbApi;
  }
  if (isEchoReactiveObject(obj)) {
    const handler = getProxyHandlerSlot(obj).handler as EchoReactiveHandlerImpl;
    return handler._objectCore.database?._dbApi;
  }
  return undefined;
};

export const getReferenceWithSpaceKey = (obj: EchoObject): Reference | undefined => {
  const db = getDatabaseFromObject(obj);
  return db && new Reference(obj.id, undefined, db.spaceKey.toHex());
};

export const matchKeys = (a: ForeignKey[], b: ForeignKey[]): boolean => {
  return a.some((keyA) => b.some((keyB) => keyA.source === keyB.source && keyA.id === keyB.id));
};
