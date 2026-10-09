//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';

import { type EntityStructure, encodeEntityStructure } from '@dxos/echo-protocol';

import { SNAPSHOT_JSON_LIMIT } from './sql/index.ts';

/** An object's document state as the index ships it, or nothing over {@link SNAPSHOT_JSON_LIMIT}. */
export const encodeObjectState = (
  structure: EntityStructure,
  heads: A.Heads,
): { heads: A.Heads; structure: string } | undefined => {
  const encoded = encodeEntityStructure(structure, {
    readRawString: (value) => (value instanceof A.RawString ? value.toString() : undefined),
  });
  return encoded.length <= SNAPSHOT_JSON_LIMIT ? { heads, structure: encoded } : undefined;
};
