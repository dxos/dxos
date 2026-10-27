//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Query, Relation } from '@dxos/echo';

import { Feature, FeatureOperation } from '#types';

import { endpoints } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.LinkTask> = FeatureOperation.LinkTask.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ task: taskRef, feature: featureRef }) {
      const task = yield* Database.load(taskRef);
      const feature = yield* Database.load(featureRef);
      const existing = yield* Database.query(Query.select(Filter.id(task.id)).sourceOf(Feature.Implements)).run;
      if (existing.some((relation) => endpoints(relation)[1] === feature.id)) {
        return;
      }
      yield* Database.add(Feature.makeImplements({ [Relation.Source]: task, [Relation.Target]: feature }));
      yield* Database.flush();
    }),
  ),
);

export default handler;
