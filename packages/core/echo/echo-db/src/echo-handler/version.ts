//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';

import type { Live } from '@dxos/live-object';

import { createDocAccessor } from './doc-accessor';

export type ObjectVersion = {
  heads: string[];
};

export const ObjectVersion = Object.freeze({
  equals: (a: ObjectVersion, b: ObjectVersion) => JSON.stringify(a) === JSON.stringify(b),
});

/**
 * @returns The current version of the object in the database.
 * @throws If the object is not in the database.
 */
export const getVersion = (obj: Live<any>): ObjectVersion => {
  const docAccessor = createDocAccessor(obj, []);
  const doc = docAccessor.handle.doc();
  if (!doc) {
    return { heads: [] };
  }

  return { heads: A.getHeads(doc) };
};
