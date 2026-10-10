//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { decodeEntityStructure } from '@dxos/echo-protocol';
import { type QueryService } from '@dxos/protocols/rpc';

import { type SnapshotState } from './object-core.ts';

/**
 * The index's copy of the object a lazy query row describes; undefined when the row carries none (the
 * object is too large, or lives in a branch document).
 */
export const getSnapshotState = (result: QueryService.QueryResult): SnapshotState | undefined => {
  if (result.state === undefined || result.heads === undefined || result.version === undefined) {
    return undefined;
  }
  return {
    structure: decodeEntityStructure(result.state, { makeRawString: (value) => new A.RawString(value) }),
    heads: result.heads,
    version: result.version,
    updatedAt: result.updatedAt,
  };
};
