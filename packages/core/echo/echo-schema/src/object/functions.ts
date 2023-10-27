//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type ObjectSnapshot } from '@dxos/protocols/proto/dxos/echo/model/document';

import { type EchoObjectBase } from './object';
import { base, type EchoObject } from './types';
import type { EchoDatabase } from '../database';

export const setStateFromSnapshot = (obj: EchoObjectBase, snapshot: ObjectSnapshot) => {
  invariant(obj[base]._stateMachine);
  obj[base]._stateMachine.reset(snapshot);
};

export const forceUpdate = (obj: EchoObjectBase) => {
  obj[base]._itemUpdate();
};

export const getDatabaseFromObject = (obj: EchoObject): EchoDatabase | undefined => {
  return obj[base]._database;
};

export const getReferenceWithSpaceKey = (obj: EchoObject): Reference | undefined => {
  const db = getDatabaseFromObject(obj);
  return db && new Reference(obj.id, undefined, db._backend.spaceKey.toHex());
};
