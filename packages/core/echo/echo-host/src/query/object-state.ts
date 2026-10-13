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
 * Whether a client can back the object with its document's stored changes, showing `json` until it first
 * writes: the document holds only this object and no links (as the space root does), the object was not
 * merged away (the JSON carries no redirect), and the JSON is within {@link SNAPSHOT_JSON_LIMIT}.
 */
export const canBackObject = (doc: DatabaseDirectory, structure: EntityStructure, json: Obj.JSON): boolean =>
  Object.keys(doc.objects ?? {}).length === 1 &&
  Object.keys(doc.links ?? {}).length === 0 &&
  structure.system?.mergedInto === undefined &&
  JSON.stringify(json).length <= SNAPSHOT_JSON_LIMIT;
