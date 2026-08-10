// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import { SpaceProperties } from '@dxos/client-protocol';
import { getSpace } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Database, Filter, Obj } from '@dxos/echo';
import { clearSpaceEpochMigration } from '@dxos/migrations';

import { SpaceOperation } from './definitions';

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

      // Emptied before the epoch, so the surviving copy carries the cleared list.
      if (rootCollection) {
        Obj.update(rootCollection, (rootCollection) => {
          rootCollection.objects.splice(0, rootCollection.objects.length);
        });
      }
      yield* Database.flush();

      // Unlike a per-object soft delete, an epoch can only be committed through a client-attached
      // space, so this operation is unavailable on a bare database.
      const space = properties && getSpace(properties);
      if (!space) {
        return yield* Effect.die(new Error('Cannot clear a space that is not attached to a client.'));
      }

      // The space's contents are never enumerated: the migration derives what to drop from the root
      // document's own link and object maps, and commits the result as one epoch — so the cleared
      // objects are reclaimed rather than left behind as tombstones. Permanent by construction,
      // hence no undo mapping for this operation.
      const keep = [properties.id, ...(rootCollection ? [rootCollection.id] : [])];
      const { removed } = yield* Effect.promise(() => clearSpaceEpochMigration(space, { keep }));

      return { objectIds: removed };
    }),
  ),
);
export default handler;
