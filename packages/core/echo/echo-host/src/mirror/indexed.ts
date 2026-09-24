//
// Copyright 2026 DXOS.org
//

import type { Obj } from '@dxos/echo';
import { type DatabaseDirectory, type EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { type DocumentObjectRow } from '@dxos/index-core';

/** A document rebuilt from the index, and the Automerge heads it was read at. */
export type IndexedDocument = { readonly heads: string[]; readonly value: DatabaseDirectory };

/** What the snapshot store keeps beside an object's JSON: its document's `access` and its other stored fields. */
type Stored = { readonly access: DatabaseDirectory['access']; readonly structure: Omit<EntityStructure, 'data'> };

/** Rebuilds each document from its objects' rows, leaving out any the index cannot reproduce exactly. */
export const documentsFromIndex = (rows: readonly DocumentObjectRow[]): Map<string, IndexedDocument> => {
  const byDocument = Map.groupBy(rows, (row) => row.documentId);
  const documents = new Map<string, IndexedDocument>();
  for (const [documentId, documentRows] of byDocument) {
    const document = documentFromIndex(documentRows);
    if (document) {
      documents.set(documentId, document);
    }
  }
  return documents;
};

/**
 * Rebuilds a document of objects from their index rows. Returns undefined unless every object has a
 * snapshot, its stored fields and the same heads, since a tab that writes later resubscribes from
 * those heads and receives only what changed since.
 */
export const documentFromIndex = (rows: readonly DocumentObjectRow[]): IndexedDocument | undefined => {
  const objects: [string, EntityStructure][] = [];
  const heads = new Set<string>();
  let access: Stored['access'];
  for (const { objectId, snapshot, heads: objectHeads, stored } of rows) {
    if (snapshot === null || objectHeads === null || !isStored(stored)) {
      return undefined;
    }
    heads.add(objectHeads.toSorted().join('|'));
    access = stored.access;
    objects.push([objectId, { ...stored.structure, data: dataOf(snapshot) }]);
  }
  const [only] = heads;
  if (objects.length === 0 || heads.size !== 1 || only === undefined) {
    return undefined;
  }
  return {
    heads: only.split('|'),
    value: { version: SpaceDocVersion.CURRENT, ...(access ? { access } : {}), objects: Object.fromEntries(objects) },
  };
};

const isStored = (value: unknown): value is Stored =>
  typeof value === 'object' &&
  value !== null &&
  'structure' in value &&
  typeof value.structure === 'object' &&
  value.structure !== null &&
  'meta' in value.structure;

/** The object's data: the JSON form spreads it beside the `id` and the `@`-prefixed fields. */
const dataOf = (snapshot: Obj.JSON): Record<string, unknown> =>
  Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== 'id' && !key.startsWith('@')));
