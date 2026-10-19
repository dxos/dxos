//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { FeatureOperation } from '#types';

import { refId } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.RemoveFromMap> = FeatureOperation.RemoveFromMap.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ map: mapRef, feature: featureRef }) {
      const map = yield* Database.load(mapRef);
      const id = refId(featureRef);
      const index = map.features.findIndex((ref) => refId(ref) === id);
      if (index === -1) {
        return;
      }
      Obj.update(map, (map) => {
        map.features.splice(index, 1);
      });
      yield* Database.flush();
    }),
  ),
);

export default handler;
