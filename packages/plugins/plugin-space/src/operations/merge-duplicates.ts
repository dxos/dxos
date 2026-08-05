// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { applyMerge, findDuplicates, planMerge } from '@dxos/extractor';
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
      // The input arrives from a client that may be acting on a stale scan. Refuse a partial or
      // mistyped set rather than merging whatever happened to resolve.
      const requested = new Set(objectIds);
      invariant(requested.size > 1, 'A merge needs at least two distinct members.');
      invariant(objects.length === requested.size, 'Every member of a merge must still exist.');
      invariant(
        objects.every((object) => Obj.instanceOf(spec.type, object)),
        `Every member of a merge must be a ${typename}.`,
      );

      // The merge deletes the losers, so being asked to merge is not enough — the members must
      // actually share identity. Re-deriving the group over just these objects (not the whole space)
      // rejects a set that is unrelated or only partly connected, and yields the real shared keys.
      const [group, ...rest] = findDuplicates(spec, objects);
      invariant(
        group && rest.length === 0 && group.objects.length === objects.length,
        'A merge must be applied to a single duplicate group.',
      );

      const plan = planMerge(spec, group);
      const survivor = yield* applyMerge(db, spec, plan, overrides);
      yield* Database.flush({ indexes: true });

      return { survivorId: survivor.id, removedIds: plan.losers.map((loser) => loser.id) };
    }),
  ),
);

export default handler;
