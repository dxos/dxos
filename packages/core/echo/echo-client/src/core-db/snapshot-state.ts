//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { objectStructureFromJson } from '@dxos/echo/internal';
import { type QueryService } from '@dxos/protocols/rpc';
import * as Jsonb from '@dxos/util/Jsonb';

import { type SnapshotState } from './object-core.ts';

export const getSnapshotState = (result: QueryService.QueryResult): SnapshotState | undefined => {
  const json = documentOf(result);
  if (
    json === undefined ||
    result.heads === undefined ||
    result.bytes === undefined ||
    result.documentId === undefined
  ) {
    return undefined;
  }
  return {
    structure: objectStructureFromJson(json, { createdAt: result.createdAt }),
    heads: result.heads,
    updatedAt: result.updatedAt,
    bytes: result.bytes,
    documentId: result.documentId,
  };
};

/** A row's object JSON, from whichever encoding the host shipped it in. */
const documentOf = (result: QueryService.QueryResult): Obj.JSON | undefined => {
  const json: unknown =
    result.documentJsonb !== undefined
      ? Jsonb.decode(result.documentJsonb)
      : result.documentJson !== undefined
        ? JSON.parse(result.documentJson)
        : undefined;
  return isObjectJson(json) ? json : undefined;
};

const isObjectJson = (value: unknown): value is Obj.JSON =>
  typeof value === 'object' && value !== null && typeof Reflect.get(value, 'id') === 'string';
