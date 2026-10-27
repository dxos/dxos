//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Feature, FeatureOperation } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.Create> = FeatureOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ key, name, description, requirements, status = 'planned', specs, project, parent }) {
      const draft = Feature.make({
        name,
        description,
        status,
        requirements: requirements?.map((requirement) => ({ ...requirement })) ?? [],
        specs: specs ? [...specs] : undefined,
        // A subfeature belongs to the project of its root, so it never holds one of its own.
        ...(parent ? { parent } : { project }),
      });
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
