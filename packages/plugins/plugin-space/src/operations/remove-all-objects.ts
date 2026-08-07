// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Database, Filter, Obj, Query } from '@dxos/echo';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.RemoveAllObjects> = SpaceOperation.RemoveAllObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const objects = yield* Database.query(Query.select(Filter.everything())).run;
      const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
      // Loaded (not read via `.target`, which is undefined for an unloaded ref) before computing the
      // removal set, so an annotated-but-unresolvable root collection fails before any mutation.
      const rootCollectionRef = properties
        ? Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)
        : undefined;
      const rootCollection = rootCollectionRef ? yield* Database.load(rootCollectionRef) : undefined;

      const removed = objects.filter(
        (object) => !Obj.instanceOf(SpaceProperties, object) && object.id !== rootCollection?.id,
      );
      for (const object of removed) {
        yield* Database.remove(object);
      }

      if (rootCollection) {
        Obj.update(rootCollection, (rootCollection) => {
          rootCollection.objects.splice(0, rootCollection.objects.length);
        });
      }
      yield* Database.flush();

      return { objectIds: removed.map((object) => object.id) };
    }),
  ),
);
export default handler;
