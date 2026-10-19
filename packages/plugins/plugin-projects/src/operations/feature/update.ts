//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { FeatureOperation } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.Update> = FeatureOperation.Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ feature: featureRef, name, description, status, specs, subfeatures }) {
      const feature = yield* Database.load(featureRef);
      Obj.update(feature, (feature) => {
        if (name !== undefined) {
          feature.name = name;
        }
        if (description !== undefined) {
          feature.description = description;
        }
        if (status !== undefined) {
          feature.status = status;
        }
        if (specs !== undefined) {
          feature.specs = [...specs];
        }
        if (subfeatures !== undefined) {
          feature.subfeatures = subfeatures.map((subfeature) => ({ ...subfeature }));
        }
      });
      yield* Database.flush();
    }),
  ),
);

export default handler;
