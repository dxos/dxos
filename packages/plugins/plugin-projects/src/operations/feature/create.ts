//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Feature, FeatureOperation } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.Create> = FeatureOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, description, status = 'planned', specs, project }) {
      const feature = yield* Database.add(
        Feature.make({ name, description, status, specs: specs ? [...specs] : undefined, project }),
      );
      yield* Database.flush();
      return { feature };
    }),
  ),
);

export default handler;
