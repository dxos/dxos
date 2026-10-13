//
// Copyright 2026 DXOS.org
//

import type { Obj } from '@dxos/echo';
import { BACKED_OBJECT_LIMIT, type DatabaseDirectory, type EntityStructure } from '@dxos/echo-protocol';

export const isBackable = (doc: DatabaseDirectory, structure: EntityStructure): boolean =>
  Object.keys(doc.objects ?? {}).length === 1 &&
  Object.keys(doc.links ?? {}).length === 0 &&
  structure.system?.mergedInto === undefined;

export const backingJson = (doc: DatabaseDirectory, structure: EntityStructure, json: Obj.JSON): string | undefined => {
  if (!isBackable(doc, structure)) {
    return undefined;
  }
  const text = JSON.stringify(json);
  return text.length <= BACKED_OBJECT_LIMIT ? text : undefined;
};

export const isSaved = (storedHeads: readonly string[] | undefined, heads: readonly string[]): boolean =>
  storedHeads !== undefined && sameHeads(storedHeads, heads);

export const sameHeads = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((head) => right.includes(head));
