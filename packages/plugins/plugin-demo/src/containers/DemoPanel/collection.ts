//
// Copyright 2026 DXOS.org
//

/**
 * Helper to ensure demo objects end up in a visible Collection in the
 * Composer sidebar.
 *
 * Background: plain `db.add(obj)` writes the object to the space's
 * ECHO database, but Composer's LHS tree only shows objects that are
 * children of the space's root Collection (or of a sub-collection
 * reachable from the root). Without wiring, the nicely-seeded board,
 * matches, nudges and docs are invisible to the audience during the
 * demo.
 *
 * `ensureDemoCollection` creates a single "Widgets Team demo"
 * Collection at the root and returns it. Callers then push their new
 * objects' refs into `collection.objects` via `addToDemoCollection`.
 * Idempotent — if the collection already exists we reuse it.
 */

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Collection, type Database, Filter, Obj, Ref } from '@dxos/echo';

const DEMO_COLLECTION_NAME = 'Widgets Team demo';

const getRootCollection = async (db: Database.Database): Promise<Collection.Collection | undefined> => {
  const properties = await db.query(Filter.type(SpaceProperties)).run();
  if (properties.length === 0) {
    return undefined;
  }
  const rootRef = (properties[0] as Record<string, unknown>)[Collection.Collection.typename] as
    | Ref.Ref<Collection.Collection>
    | undefined;
  if (rootRef) {
    return rootRef.load();
  }
  const fresh = Collection.make({ objects: [] });
  db.add(fresh);
  Obj.change(properties[0], (mutable: Record<string, unknown>) => {
    mutable[Collection.Collection.typename] = Ref.make(fresh);
  });
  return fresh;
};

export const ensureDemoCollection = async (db: Database.Database): Promise<Collection.Collection | undefined> => {
  const root = await getRootCollection(db);
  if (!root) {
    return undefined;
  }
  // Check existing root children for an already-present demo collection.
  const existingRefs = (root.objects ?? []) as Ref.Ref<Obj.Any>[];
  for (const ref of existingRefs) {
    const target = ref.target;
    if (Collection.isCollection(target) && (target as Collection.Collection).name === DEMO_COLLECTION_NAME) {
      return target as Collection.Collection;
    }
  }
  const demoCollection = Collection.make({ name: DEMO_COLLECTION_NAME, objects: [] });
  db.add(demoCollection);
  Obj.change(root, (mutable) => {
    mutable.objects.push(Ref.make(demoCollection));
  });
  return demoCollection;
};

/**
 * Push `obj` into the demo collection so it's visible in the sidebar.
 * Safe to call repeatedly — existing refs are deduped by id.
 */
export const addToDemoCollection = async (db: Database.Database, obj: Obj.Unknown): Promise<void> => {
  const collection = await ensureDemoCollection(db);
  if (!collection) {
    return;
  }
  const currentIds = new Set((collection.objects ?? []).map((ref: Ref.Ref<Obj.Any>) => ref.target?.id).filter(Boolean));
  if (currentIds.has(obj.id)) {
    return;
  }
  Obj.change(collection, (mutable) => {
    mutable.objects.push(Ref.make(obj));
  });
};
