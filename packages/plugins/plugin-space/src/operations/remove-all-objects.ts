// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Database, Filter, Obj } from '@dxos/echo';

import * as SpaceOperation from '../types/SpaceOperation';

const handler: Operation.WithHandler<typeof SpaceOperation.RemoveAllObjects> = SpaceOperation.RemoveAllObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
      // Loaded (not read via `.target`, which is undefined for an unloaded ref) before anything is
      // dropped, so an annotated-but-unresolvable root collection fails before any mutation.
      const rootCollectionRef = properties
        ? Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)
        : undefined;
      const rootCollection = rootCollectionRef ? yield* Database.load(rootCollectionRef) : undefined;

      // Emptied before the drop, so the surviving copy carries the cleared list.
      if (rootCollection) {
        Obj.update(rootCollection, (rootCollection) => {
          rootCollection.objects.splice(0, rootCollection.objects.length);
        });
      }
      yield* Database.flush();

      // The space's contents are never enumerated: the retained ids are diffed against the space
      // directory's own maps, and everything else is dropped in one change. The objects are gone
      // rather than soft-deleted, hence no undo mapping for this operation.
      const keep = [...(properties ? [properties.id] : []), ...(rootCollection ? [rootCollection.id] : [])];
      const objectIds = yield* Database.retainObjects(keep);
      yield* Database.flush();

      // Dropping the links only orphans the documents; collecting is what reclaims them here and,
      // as the change replicates, on every other peer.
      yield* Database.runGarbageCollection();

      return { objectIds };
    }),
  ),
);
export default handler;
