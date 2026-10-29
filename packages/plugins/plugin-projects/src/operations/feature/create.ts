//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Feature, FeatureOperation, SpecText } from '#types';

import { attach, ensureBreakdown } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.Create> = FeatureOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ key, name, description, requirements, status = 'planned', specs, spec: specRef, parent }) {
      const spec = specRef
        ? yield* Database.load(specRef)
        : parent
          ? yield* ensureBreakdown(yield* Database.load(parent))
          : yield* Effect.fail(new FeatureOperation.NoSpecError());
      const draft = Feature.make({
        name,
        description,
        status,
        requirements: requirements?.map((requirement) => ({ ...requirement })) ?? [],
      });
      if (key) {
        Obj.update(draft, (draft) => {
          Obj.getMeta(draft).key = key;
        });
      }
      const feature = yield* Database.add(draft);
      if (specs) {
        Feature.setSources(feature, specs);
      }
      attach(spec, feature);
      // The document is canonical for what the spec holds, so the feature is embedded there too.
      yield* Effect.promise(() => SpecText.embed(spec, feature));
      yield* Database.flush();
      return { feature };
    }),
  ),
);

export default handler;
