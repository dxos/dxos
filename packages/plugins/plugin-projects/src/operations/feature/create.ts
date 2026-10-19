//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { Feature, FeatureOperation } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.Create> = FeatureOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, description, status = 'planned', specs, parent: parentRef, map: mapRef }) {
      const feature = Feature.make({ name, description, status, specs: specs ? [...specs] : undefined });
      if (parentRef) {
        // Listed in the parent's `subfeatures`, which parents it: it is added with the parent and deleted with it.
        const parent = yield* Database.load(parentRef);
        Obj.update(parent, (parent) => {
          parent.subfeatures = [...(parent.subfeatures ?? []), Ref.make(feature)];
        });
      } else {
        yield* Database.add(feature);
      }
      if (mapRef) {
        const map = yield* Database.load(mapRef);
        Obj.update(map, (map) => {
          map.features.push(Ref.make(feature));
        });
      }
      yield* Database.flush();
      return { feature };
    }),
  ),
);

export default handler;
