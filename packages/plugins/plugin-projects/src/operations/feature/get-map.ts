//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { Task } from '@dxos/types';

import { Feature, FeatureOperation, Showcase } from '#types';

import { endpoints } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.GetMap> = FeatureOperation.GetMap.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ map: mapRef }) {
      const map = yield* Database.load(mapRef);
      const features: FeatureOperation.FeatureSummary[] = [];
      for (const ref of map.features) {
        const feature = yield* Database.load(ref);
        const selected = Query.select(Filter.id(feature.id));
        const dependsOn = yield* Database.query(selected.sourceOf(Feature.DependsOn)).run;
        const tasks = yield* Database.query(selected.targetOf(Feature.Implements).source()).run;
        const showcases = yield* Database.query(selected.targetOf(Showcase.Demonstrates).source()).run;
        features.push({
          id: feature.id,
          name: feature.name,
          status: feature.status,
          specs: [...(feature.specs ?? [])],
          subfeatures: (feature.subfeatures ?? []).map((subfeature) => ({ ...subfeature })),
          dependsOn: dependsOn.map((relation) => endpoints(relation)[1]),
          tasks: tasks
            .filter((task): task is Task.Task => Obj.instanceOf(Task.Task, task))
            .map(({ id, title, status }) => ({ id, title, status })),
          showcases: showcases.map(({ id, name }) => ({ id, name })),
        });
      }
      return { name: map.name, features };
    }),
  ),
);

export default handler;
