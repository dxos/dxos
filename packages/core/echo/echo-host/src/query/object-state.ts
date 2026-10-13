//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';

import { type DatabaseDirectory, type EntityStructure, encodeEntityStructure } from '@dxos/echo-protocol';

import { SNAPSHOT_JSON_LIMIT } from './sql/index.ts';

/** Largest document, in Automerge bytes, whose bytes ship with its object's state. */
export const OBJECT_BYTES_LIMIT = 64 * 1024;

/**
 * An object's document state as the index ships it, with the document's bytes a client backs it from;
 * nothing when either is over its limit, since a client cannot use one without the other. `save` runs
 * only for a state that is kept, since serializing the document is the costly part.
 */
export const encodeObjectState = (
  structure: EntityStructure,
  heads: A.Heads,
  save: () => Uint8Array | undefined,
): { heads: A.Heads; structure: string; bytes: Uint8Array } | undefined => {
  const encoded = encodeEntityStructure(structure, {
    readRawString: (value) => (value instanceof A.RawString ? value.toString() : undefined),
  });
  if (encoded.length > SNAPSHOT_JSON_LIMIT) {
    return undefined;
  }
  const bytes = save();
  return bytes && { heads, structure: encoded, bytes };
};

/**
 * The document's bytes, which a client loads to write to its one object, or undefined when the
 * document holds more than one object or links (the space root) or is over {@link OBJECT_BYTES_LIMIT}.
 */
export const saveObjectDocument = (doc: A.Doc<DatabaseDirectory>): Uint8Array | undefined => {
  if (Object.keys(doc.objects ?? {}).length !== 1 || Object.keys(doc.links ?? {}).length > 0) {
    return undefined;
  }
  const bytes = A.save(doc);
  return bytes.length <= OBJECT_BYTES_LIMIT ? bytes : undefined;
};
