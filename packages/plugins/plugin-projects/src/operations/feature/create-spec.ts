//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { FeatureOperation } from '#types';

import { addSpec, ensureBreakdown } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.CreateSpec> = FeatureOperation.CreateSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, description, dialects, project, feature: featureRef }) {
      if (featureRef) {
        const feature = yield* Database.load(featureRef);
        if (project) {
          return yield* Effect.fail(
            new FeatureOperation.BreakdownSpecError({
              message: `The spec breaking down "${feature.name}" belongs to it; its work is tracked in the project above it.`,
            }),
          );
        }
        const hadSpec = !!feature.spec;
        const spec = yield* ensureBreakdown(feature);
        if (!hadSpec) {
          Obj.update(spec, (spec) => {
            spec.name = name;
            spec.description = description;
          });
        }
        yield* Database.flush();
        return { spec };
      }
      const spec = yield* addSpec({ name, description, dialects, project });
      yield* Database.flush();
      return { spec };
    }),
  ),
);

export default handler;
