//
// Copyright 2024 DXOS.org
//

import { next as am, type Doc, type Heads, type State } from '@automerge/automerge';

import type { Obj } from '@dxos/echo';
import { ObjectStructure } from '@dxos/echo-protocol';
import { ATTR_META, ATTR_TYPE } from '@dxos/echo-schema';
import { assertArgument } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

import { getObjectCore, isEchoObject } from './echo-handler';
import { ObjectCore } from '../core-db';

/**
 * Returns the edit history of an ECHO object.
 * NOTE: This is the history of the automerge document containing the echo object.
 */
export const getEditHistory = (object: Obj.Any): State<any>[] => {
  assertArgument(isEchoObject(object), 'expected ECHO object stored in the database');

  const objectCore = getObjectCore(object);
  const doc = objectCore.getDoc();
  const changes = am.getHistory(doc as Doc<any>);
  return changes;
};

/**
 * @returns Raw object data at the given version.
 */
// TODO(dmaretskyi): Hyderate the object
export const checkoutVersion = (object: Obj.Any, version: Heads): unknown => {
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

  const structure: ObjectStructure | undefined = getDeep(snapshot, [...objectCore.mountPath]);

  // TODO(dmaretskyi): Fix this nonsense.
  return {
    id: objectCore.id,
    [ATTR_TYPE]: structure && ObjectStructure.getTypeReference(structure)?.['/'],
    [ATTR_META]: structure?.meta,
    ...(structure && structure.data),
  } as any;
};
