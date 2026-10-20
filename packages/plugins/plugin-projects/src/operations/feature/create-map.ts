//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { FeatureMap, FeatureOperation } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.CreateMap> = FeatureOperation.CreateMap.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, features = [] }) {
      const map = yield* Database.add(FeatureMap.make({ name, features: [...features] }));
      yield* Database.flush();
      return { map };
    }),
  ),
);

export default handler;
