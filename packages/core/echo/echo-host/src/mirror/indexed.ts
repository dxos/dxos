//
// Copyright 2026 DXOS.org
//

import type { Obj } from '@dxos/echo';
import { type DatabaseDirectory, type EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';

import { ATTR_HEADS, ATTR_STORED } from '../db-host/automerge-data-source.ts';

/** An object as the index holds it. */
export type IndexedObject = { readonly objectId: string; readonly snapshot: Obj.JSON };

/** A document rebuilt from the index, and the Automerge heads it was read at. */
export type IndexedDocument = { readonly heads: string[]; readonly value: DatabaseDirectory };

/** What {@link ATTR_STORED} holds: the object's stored fields other than `data`, and its document's `access`. */
type Stored = { readonly access: DatabaseDirectory['access']; readonly structure: Omit<EntityStructure, 'data'> };

/**
 * Rebuilds a document of objects from their index snapshots. Returns undefined when the index cannot
 * stand in for the document exactly: a snapshot without heads or stored fields, or objects read at
 * different heads, since a tab that writes later resubscribes from those heads.
 */
export const documentFromIndex = (objects: readonly IndexedObject[]): IndexedDocument | undefined => {
  const heads = new Set(objects.map(({ snapshot }) => headsOf(snapshot)?.join('|')));
  const [only] = heads;
  const stored = objects.map(({ snapshot }) => storedOf(snapshot));
  if (objects.length === 0 || heads.size !== 1 || only === undefined || !stored.every((entry) => entry !== undefined)) {
    return undefined;
  }
  return {
    heads: only.split('|'),
    value: {
      version: SpaceDocVersion.CURRENT,
      ...(stored[0].access ? { access: stored[0].access } : {}),
      objects: Object.fromEntries(
        objects.map(({ objectId, snapshot }, index) => [
          objectId,
          { ...stored[index].structure, data: dataOf(snapshot) },
        ]),
      ),
    },
  };
};

const headsOf = (snapshot: Obj.JSON): string[] | undefined => {
  const heads: unknown = Reflect.get(snapshot, ATTR_HEADS);
  return Array.isArray(heads) && heads.every((head) => typeof head === 'string') ? heads.toSorted() : undefined;
};

const storedOf = (snapshot: Obj.JSON): Stored | undefined => {
  const stored: unknown = Reflect.get(snapshot, ATTR_STORED);
  return isStored(stored) ? stored : undefined;
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
