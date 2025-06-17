//
// Copyright 2024 DXOS.org
//

import { next as am, type Doc, type Heads, type State } from '@automerge/automerge';

import { ATTR_META, ATTR_TYPE, type BaseObject } from '@dxos/echo-schema';
import { assertArgument } from '@dxos/invariant';

import { isEchoObject, type AnyLiveObject } from './echo-handler';
import { getObjectCore } from './echo-handler';
import { ObjectCore } from '../core-db';

/**
 * Returns the edit history of an ECHO object.
 * NOTE: This is the history of the automerge document containing the echo object.
 */
export const getEditHistory = (object: AnyLiveObject<any>): State<any>[] => {
  assertArgument(isEchoObject(object), 'expected ECHO object stored in the database');

  const objectCore = getObjectCore(object);
  const doc = objectCore.getDoc();
  const changes = am.getHistory(doc as Doc<any>);
  return changes;
};

/**
 * @returns Snapshot of the object at the given version in the JSON format.
 */
// TODO(dmaretskyi): Returning T is actually wrong since the object is actually in JSON format -- we should unify data formats.
export const checkoutVersion = <T extends BaseObject>(object: AnyLiveObject<T>, version: Heads): T => {
  assertArgument(isEchoObject(object), 'expected ECHO object stored in the database');
  assertArgument(Array.isArray(version), 'expected automerge heads array');

  const objectCore = getObjectCore(object);
  const doc = objectCore.getDoc();
  const snapshot = am.view(doc as Doc<any>, version);

  // TODO(dmaretskyi): Refactor so this doesn't have to create another core.
  const versionCore = new ObjectCore();
  versionCore.id = objectCore.id;
  versionCore.doc = snapshot;
  versionCore.mountPath = objectCore.mountPath;

  // TODO(dmaretskyi): Fix this nonsense.
  const { id, __typename, __meta, ...data } = versionCore.toPlainObject();
  return {
    id,
    [ATTR_TYPE]: __typename,
    [ATTR_META]: __meta,
    ...data,
  } as any;
};
