//
// Copyright 2026 DXOS.org
//

import { objectStructureFromJson } from '@dxos/echo/internal';
import { type QueryService } from '@dxos/protocols/rpc';

import { type SnapshotState } from './object-core.ts';

export const getSnapshotState = (result: QueryService.QueryResult): SnapshotState | undefined => {
  if (
    result.documentJson === undefined ||
    result.heads === undefined ||
    result.bytes === undefined ||
    result.documentId === undefined
  ) {
    return undefined;
  }
  return {
    structure: objectStructureFromJson(JSON.parse(result.documentJson), { createdAt: result.createdAt }),
    heads: result.heads,
    updatedAt: result.updatedAt,
    bytes: result.bytes,
    documentId: result.documentId,
  };
};
