//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';

import { Feature, FeatureOperation, FeatureSpec } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.ImportSpec> = FeatureOperation.ImportSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ path, text, project, parent }) {
      const blocks = FeatureSpec.parse(text);
      const sources = new Set(blocks.map(({ id }) => FeatureSpec.getSource(path, id)));
      // A feature imported before is found by the block it records, wherever it has been moved to since.
      const existing = new Map<string, Feature.Feature>();
      for (const feature of (yield* Database.query(Filter.type(Feature.Feature)).run).filter(Feature.instanceOf)) {
        for (const spec of feature.specs ?? []) {
          if (sources.has(spec)) {
            existing.set(spec, feature);
          }
        }
      }

      const created: string[] = [];
      const updated: string[] = [];
      for (const { id, name, description, requirements } of blocks) {
        const source = FeatureSpec.getSource(path, id);
        const feature = existing.get(source);
        if (feature) {
          // The name and description may have been rewritten by hand since; the spec owns only the requirements.
          if (JSON.stringify(feature.requirements ?? []) !== JSON.stringify(requirements)) {
            Obj.update(feature, (feature) => {
              feature.requirements = requirements;
            });
            updated.push(feature.id);
          }
          continue;
        }
        const added = yield* Database.add(
          Feature.make({
            name,
            description,
            requirements,
            status: 'planned',
            specs: [source],
            ...(parent ? { parent } : { project }),
          }),
        );
        created.push(added.id);
      }
      yield* Database.flush();
      return { created, updated };
    }),
  ),
);

export default handler;
