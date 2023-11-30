//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ObjectSnapshot } from '@dxos/protocols/proto/dxos/echo/model/document';
import { type TextSnapshot } from '@dxos/protocols/proto/dxos/echo/model/text';

import { type AbstractEchoObject } from './object';
import { base, db, type EchoObject, type ForeignKey } from './types';
import { AutomergeObject } from '../automerge';
import type { EchoDatabase } from '../database';

export const setStateFromSnapshot = (obj: AbstractEchoObject, snapshot: ObjectSnapshot | TextSnapshot) => {
  invariant(obj[base]._stateMachine);
  obj[base]._stateMachine.reset(snapshot);
};

export const forceUpdate = (obj: AbstractEchoObject) => {
  obj[base]._itemUpdate();
};

export const getDatabaseFromObject = (obj: EchoObject): EchoDatabase | undefined => {
  if (obj instanceof AutomergeObject) {
    return obj[db];
  }
  return obj[base]._database;
};

export const getReferenceWithSpaceKey = (obj: EchoObject): Reference | undefined => {
  const db = getDatabaseFromObject(obj);
  return db && new Reference(obj.id, undefined, db._backend.spaceKey.toHex());
};

export const matchKeys = (a: ForeignKey[], b: ForeignKey[]): boolean =>
  a.some((keyA) => b.some((keyB) => keyA.source === keyB.source && keyA.id === keyB.id));
