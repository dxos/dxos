//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Collection, Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

/**
 * A type tagged as a collection item files into the space's root collection, which is created when a
 * space has properties but no root yet (e.g. one made with the bare SDK). A database with no properties
 * at all is not a Composer space, so nothing files there.
 */
export const rootCollectionRule: AppCapabilities.DefaultParent = {
  tag: Collection.ItemTag,
  resolve: () =>
    Effect.gen(function* () {
      const objects = yield* Database.query(Filter.type(SpaceProperties)).run;
      invariant(objects.length <= 1, 'Multiple SpaceProperties objects found');
      const [properties] = objects;
      if (!properties) {
        return undefined;
      }

      const ref = Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined);
      if (ref) {
        return yield* Database.load<Collection.Collection>(ref);
      }

      const root = yield* Database.add(Collection.make());
      Obj.update(properties, (properties) => {
        Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(root));
      });
      return root;
    }),
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(AppCapabilities.DefaultParent, rootCollectionRule)),
);
