//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Relation } from '@dxos/echo';

import { FeatureOperation, Showcase } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.CreateShowcase> = FeatureOperation.CreateShowcase.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, content, targets, artifacts = [] }) {
      // Resolved before any write, so a stale target ref leaves no orphaned showcase behind.
      const resolved = [];
      for (const targetRef of targets) {
        resolved.push(yield* Database.load(targetRef));
      }
      const showcase = yield* Database.add(Showcase.make({ name, content, artifacts: [...artifacts] }));
      for (const target of resolved) {
        yield* Database.add(Showcase.makeDemonstrates({ [Relation.Source]: showcase, [Relation.Target]: target }));
      }
      yield* Database.flush();
      return { showcase };
    }),
  ),
);

export default handler;
