// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Query } from '@dxos/echo';
import { applyMerge, planMerge } from '@dxos/extractor';
import { invariant } from '@dxos/invariant';

import { SpaceOperation } from './definitions';
import { resolveIdentitySpec } from './helpers';

const handler: Operation.WithHandler<typeof SpaceOperation.MergeDuplicates> = SpaceOperation.MergeDuplicates.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ typename, objectIds, overrides }) {
      const spec = yield* resolveIdentitySpec(typename);
      invariant(spec, `No identity spec registered for ${typename}.`);

      const { db } = yield* Database.Service;
      // Re-resolve live proxies by id: the caller's objects crossed the operation boundary as
      // snapshots, and a merge must mutate the reactive object the space actually holds.
      const objects = yield* Database.query(Query.select(Filter.id(...objectIds))).run;
      invariant(objects.length > 1, 'A merge needs at least two members.');

      const plan = planMerge(spec, { keys: [], objects });
      const survivor = yield* applyMerge(db, spec, plan, overrides);
      yield* Database.flush({ indexes: true });

      return { survivorId: survivor.id, removedIds: plan.losers.map((loser) => loser.id) };
    }),
  ),
);

export default handler;
