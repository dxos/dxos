//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { FeatureOperation } from '#types';

import { refId } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.AddToMap> = FeatureOperation.AddToMap.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ map: mapRef, feature: featureRef }) {
      const map = yield* Database.load(mapRef);
      const id = refId(featureRef);
      if (map.features.some((ref) => refId(ref) === id)) {
        return;
      }
      Obj.update(map, (map) => {
        map.features.push(featureRef);
      });
      yield* Database.flush();
    }),
  ),
);

export default handler;
