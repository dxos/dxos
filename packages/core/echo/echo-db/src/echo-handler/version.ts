//
// Copyright 2025 DXOS.org
//

import { next as Automerge } from '@dxos/automerge/automerge';
import type { Live } from '@dxos/live-object';

import { createDocAccessor } from '../core-db';

export type ObjectVersion = {
  heads: string[];
};

export const ObjectVersion = Object.freeze({
  equals: (a: ObjectVersion, b: ObjectVersion) => {
    return JSON.stringify(a) === JSON.stringify(b);
  },
});

/**
 * @returns The current version of the object in the database.
 * @throws If the object is not in the database.
 */
export const getVersion = (obj: Live<any>): ObjectVersion => {
  const docAccessor = createDocAccessor(obj, []);
  const doc = docAccessor.handle.docSync();
  if (!doc) {
    return { heads: [] };
  }
  return { heads: Automerge.getHeads(doc) };
};
