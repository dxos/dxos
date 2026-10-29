//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Relation } from '@dxos/echo';

import { Feature, FeatureOperation } from '#types';

import { endpoints } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.AddDependency> = FeatureOperation.AddDependency.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ feature: featureRef, dependsOn: dependencyRef }) {
      const feature = yield* Database.load(featureRef);
      const dependency = yield* Database.load(dependencyRef);
      const edges = (yield* Database.query(Filter.type(Feature.DependsOn)).run).map(endpoints);
      if (edges.some(([source, target]) => source === feature.id && target === dependency.id)) {
        return;
      }

      const cycle = Feature.findDependencyCycle(edges, feature.id, dependency.id);
      if (cycle) {
        const names = new Map([
          [feature.id, feature.name],
          [dependency.id, dependency.name],
        ]);
        for (const id of cycle) {
          if (!names.has(id)) {
            const [other] = yield* Database.query(Filter.id(id)).run;
            names.set(id, Feature.instanceOf(other) ? other.name : id);
          }
        }
        return yield* Effect.fail(
          new FeatureOperation.DependencyCycleError({
            message: `"${feature.name}" cannot depend on "${dependency.name}": ${[feature.id, ...cycle]
              .map((id) => names.get(id))
              .join(' -> ')} would close a cycle.`,
          }),
        );
      }

      yield* Database.add(Feature.makeDependsOn({ [Relation.Source]: feature, [Relation.Target]: dependency }));
      yield* Database.flush();
    }),
  ),
);

export default handler;
