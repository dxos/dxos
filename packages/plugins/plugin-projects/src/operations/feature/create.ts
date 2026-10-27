//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Feature, FeatureOperation } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.Create> = FeatureOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ key, name, description, status = 'planned', specs, project }) {
      const draft = Feature.make({ name, description, status, specs: specs ? [...specs] : undefined, project });
      if (key) {
        Obj.update(draft, (draft) => {
          Obj.getMeta(draft).key = key;
        });
      }
      const feature = yield* Database.add(draft);
      yield* Database.flush();
      return { feature };
    }),
  ),
);

export default handler;
