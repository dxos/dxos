//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { SpaceProperties } from '@dxos/client-protocol';
import { Annotation, Collection, Database, Obj, Ref } from '@dxos/echo';

import * as AppAnnotation from '../echo/AppAnnotation.ts';

/**
 * Seeds a root collection and `SpaceProperties` with the `RootCollectionAnnotation` before running
 * the effect, so operations that resolve the space root (e.g. `CollectionModel.add`) work in tests.
 */
export const WithProperties = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | Database.Service> =>
  Effect.andThen(
    Effect.gen(function* () {
      const collection = Collection.make({ objects: [] });
      const properties = Obj.make(SpaceProperties, {});
      yield* Database.add(collection);
      yield* Database.add(properties);
      // Both entities are in the DB before setting the annotation so Database.load
      // works in CollectionModel.add (which uses the Effect DB context, not Ref.load).
      Obj.update(properties, (properties) => {
        const meta = Obj.getMeta(properties);
        if (!meta.annotations) {
          meta.annotations = {};
        }
        Annotation.setDictionary(meta.annotations, AppAnnotation.RootCollectionAnnotation, Ref.make(collection));
      });
    }),
    effect,
  );

export * from './SampleSpaceBuilder';
