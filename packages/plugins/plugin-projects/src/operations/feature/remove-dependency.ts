//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Query } from '@dxos/echo';

import { Feature, FeatureOperation } from '#types';

import { endpoints, refId } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.RemoveDependency> = FeatureOperation.RemoveDependency.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ feature: featureRef, dependsOn: dependencyRef }) {
      const target = refId(dependencyRef);
      const relations = yield* Database.query(Query.select(Filter.id(refId(featureRef))).sourceOf(Feature.DependsOn))
        .run;
      for (const relation of relations) {
        if (endpoints(relation)[1] === target) {
          yield* Database.remove(relation);
        }
      }
      yield* Database.flush();
    }),
  ),
);

export default handler;
