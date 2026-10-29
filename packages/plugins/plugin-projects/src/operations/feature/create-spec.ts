//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { FeatureOperation, Spec } from '#types';

import { ensureBreakdown } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.CreateSpec> = FeatureOperation.CreateSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, description, project, feature: featureRef }) {
      if (featureRef) {
        const feature = yield* Database.load(featureRef);
        const hadSpec = !!feature.spec;
        const spec = yield* ensureBreakdown(feature);
        if (!hadSpec) {
          Obj.update(spec, (spec) => {
            spec.name = name;
            spec.description = description;
            spec.project = project;
          });
        }
        yield* Database.flush();
        return { spec };
      }
      const spec = yield* Database.add(Spec.make({ name, description, project }));
      yield* Database.flush();
      return { spec };
    }),
  ),
);

export default handler;
