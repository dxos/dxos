//
// Copyright 2026 DXOS.org
//

import { objectStructureFromJson } from '@dxos/echo/internal';
import { type QueryService } from '@dxos/protocols/rpc';

import { type SnapshotState } from './object-core.ts';

/**
 * The index's copy of the object a document row describes; undefined when the row carries no JSON and
 * stored changes to back it with (the object is too large, shares its document, or lives in a branch).
 */
export const getSnapshotState = (result: QueryService.QueryResult): SnapshotState | undefined => {
  if (
    result.documentJson === undefined ||
    result.heads === undefined ||
    result.bytes === undefined ||
    result.documentId === undefined
  ) {
    return undefined;
  }
  const structure = objectStructureFromJson(JSON.parse(result.documentJson));
  // The JSON carries the object's data and meta; its creation time comes with the row.
  if (result.createdAt !== undefined) {
    structure.system = { ...structure.system, createdAt: result.createdAt };
  }
  return {
    structure,
    heads: result.heads,
    updatedAt: result.updatedAt,
    bytes: result.bytes,
    documentId: result.documentId,
  };
};
