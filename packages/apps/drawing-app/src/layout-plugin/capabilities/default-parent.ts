//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { SpaceProperties } from '@dxos/client/echo';
import { Annotation, Collection, Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

/**
 * Files a collection item (a drawing) into the space's root collection, creating the root when the space has
 * none, so Composer's navigator lists what this app creates (spec F-4.2). The same rule SpacePlugin contributes.
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

      const { db } = yield* Database.Service;
      const root = AppAnnotation.addRootCollection(db);
      Obj.update(properties, (properties) => {
        Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(root));
      });
      return root;
    }),
};
