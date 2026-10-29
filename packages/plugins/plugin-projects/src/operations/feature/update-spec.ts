//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { FeatureOperation } from '#types';

import { clearProject, setProject } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.UpdateSpec> = FeatureOperation.UpdateSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ spec: specRef, name, description, project }) {
      const spec = yield* Database.load(specRef);
      if (project === null) {
        clearProject(spec);
      } else if (project !== undefined) {
        yield* setProject(spec, project);
      }
      Obj.update(spec, (spec) => {
        if (name !== undefined) {
          spec.name = name;
        }
        if (description !== undefined) {
          spec.description = description;
        }
      });
      yield* Database.flush();
    }),
  ),
);

export default handler;
