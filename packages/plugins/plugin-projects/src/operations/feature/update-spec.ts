//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { FeatureOperation } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.UpdateSpec> = FeatureOperation.UpdateSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ spec: specRef, name, description, project }) {
      const spec = yield* Database.load(specRef);
      Obj.update(spec, (spec) => {
        if (name !== undefined) {
          spec.name = name;
        }
        if (description !== undefined) {
          spec.description = description;
        }
        if (project === null) {
          delete spec.project;
        } else if (project !== undefined) {
          spec.project = project;
        }
      });
      yield* Database.flush();
    }),
  ),
);

export default handler;
