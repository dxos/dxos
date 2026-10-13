//
// Copyright 2026 DXOS.org
//

import type { Obj } from '@dxos/echo';
import { type DatabaseDirectory, type EntityStructure } from '@dxos/echo-protocol';

/** Largest object JSON, in characters, a client backs a live object with; a larger object loads its document. */
export const SNAPSHOT_JSON_LIMIT = 64 * 1024;

/** Largest stored document, in bytes, that ships with its object's row; a larger one loads in full instead. */
export const OBJECT_BYTES_LIMIT = 64 * 1024;

/**
 * The object's JSON as a client backs it with, showing it until it first writes, or undefined when it
 * cannot: the document must hold only this object and no links (as the space root does), the object must
 * not be merged away (the JSON carries no redirect), and the JSON must be within {@link SNAPSHOT_JSON_LIMIT}.
 */
export const backingJson = (doc: DatabaseDirectory, structure: EntityStructure, json: Obj.JSON): string | undefined => {
  if (
    Object.keys(doc.objects ?? {}).length !== 1 ||
    Object.keys(doc.links ?? {}).length > 0 ||
    structure.system?.mergedInto !== undefined
  ) {
    return undefined;
  }
  const text = JSON.stringify(json);
  return text.length <= SNAPSHOT_JSON_LIMIT ? text : undefined;
};

/** Whether two sets of document heads name the same changes, in any order. */
export const sameHeads = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((head) => right.includes(head));
