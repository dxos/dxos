//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AppAnnotation, GraphPath } from '@dxos/app-toolkit';
import { SpaceProperties } from '@dxos/client/echo';
import { Annotation, Collection, Database, Filter } from '@dxos/echo';
import { EID } from '@dxos/keys';

/** Depth cap for the collection-ancestry walk; the composer nav tree is shallow, this only guards bad data. */
const COLLECTION_WALK_MAX_DEPTH = 32;

/**
 * The path under which the nav tree shows an object, when it lives in the space's collection tree:
 * `content/collections/<ancestors…>/<objectId>`. This is an object's canonical home — the database
 * path (`system/database/<type>/<objectId>`) exists for every object but names a hidden node — so both
 * URL resolution and navigation-target resolution answer with this when it exists.
 *
 * Returns undefined for an object outside the collection tree (one reachable only via its type
 * section or the database subtree).
 */
export const resolveCollectionObjectPath = ({
  objectId,
}: {
  objectId: string;
}): Effect.Effect<string | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
    const rootRef = properties
      ? Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)
      : undefined;
    if (!rootRef) {
      return undefined;
    }

    const rootCollection = yield* Database.load(rootRef).pipe(Effect.orElseSucceed(() => undefined));
    if (!rootCollection) {
      return undefined;
    }

    const chain = yield* walkCollectionChainToRoot({ objectId, rootId: rootCollection.id });
    return chain ? GraphPath.getCollectionsPath(db.spaceId, ...chain, objectId) : undefined;
  });

/**
 * Walk up a space's collection tree from `objectId` to the root collection. A single query loads the
 * space's collections — each already carries its child refs — so the ancestry is a pure in-memory walk
 * of a child→parent index rather than a query per step. The composer ontology guarantees a tree (an
 * object lives in one collection, no cycles); on bad data the first indexed parent wins, and a
 * visited-set plus depth cap stop a cycle from looping. Returns the intermediate collection ids in
 * root→leaf order (excluding the root collection, whose objects sit directly under
 * `content/collections`), or null if no path to the root exists.
 */
export const walkCollectionChainToRoot = ({
  objectId,
  rootId,
}: {
  objectId: string;
  rootId: string;
}): Effect.Effect<string[] | null, never, Database.Service> =>
  Effect.gen(function* () {
    const collections = yield* Database.query(Filter.type(Collection.Collection)).run;
    const parentOf = new Map<string, string>();
    for (const collection of collections) {
      for (const ref of collection.objects ?? []) {
        const childId = EID.isEID(ref.uri) ? EID.getEntityId(ref.uri) : undefined;
        if (childId && !parentOf.has(childId)) {
          parentOf.set(childId, collection.id);
        }
      }
    }

    const visited = new Set<string>([objectId]);
    // Built leaf→root on the way up; the node id wants root→leaf.
    const chain: string[] = [];
    let current = objectId;
    for (let depth = 0; depth < COLLECTION_WALK_MAX_DEPTH; depth++) {
      const parent = parentOf.get(current);
      if (!parent) {
        return null;
      }
      if (parent === rootId) {
        return chain.reverse();
      }
      if (visited.has(parent)) {
        return null;
      }
      visited.add(parent);
      chain.push(parent);
      current = parent;
    }
    return null;
  });
