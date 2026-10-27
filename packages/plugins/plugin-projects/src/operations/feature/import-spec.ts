//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';

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
      // Imported features by block id, so a sub-feature (`F-3.1`) is placed beneath the feature it is part of.
      const imported = new Map<string, Feature.Feature>();
      // Shallower ids first, so a parent exists before any sub-feature that names it.
      const ordered = blocks.toSorted((left, right) => left.id.split('.').length - right.id.split('.').length);
      for (const { id, name, description, requirements, parent: specParent } of ordered) {
        const source = FeatureSpec.getSource(path, id);
        const feature = existing.get(source);
        if (feature) {
          imported.set(id, feature);
          // The name and description may have been rewritten by hand since; the spec owns only the requirements.
          if (JSON.stringify(feature.requirements ?? []) !== JSON.stringify(requirements)) {
            Obj.update(feature, (feature) => {
              feature.requirements = requirements;
            });
            updated.push(feature.id);
          }
          continue;
        }
        const parentFeature = specParent ? imported.get(specParent) : undefined;
        const added = yield* Database.add(
          Feature.make({
            name,
            description,
            requirements,
            status: 'planned',
            specs: [source],
            ...(parentFeature ? { parent: Ref.make(parentFeature) } : parent ? { parent } : { project }),
          }),
        );
        imported.set(id, added);
        created.push(added.id);
      }
      yield* Database.flush();
      return { created, updated };
    }),
  ),
);

export default handler;
