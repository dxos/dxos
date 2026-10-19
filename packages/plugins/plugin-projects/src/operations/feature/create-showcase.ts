//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Relation } from '@dxos/echo';

import { FeatureOperation, Showcase } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.CreateShowcase> = FeatureOperation.CreateShowcase.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, content, targets, media = [], pullRequests = [] }) {
      const showcase = yield* Database.add(
        Showcase.make({ name, content, media: [...media], pullRequests: [...pullRequests] }),
      );
      for (const targetRef of targets) {
        const target = yield* Database.load(targetRef);
        yield* Database.add(Showcase.makeShowcases({ [Relation.Source]: showcase, [Relation.Target]: target }));
      }
      yield* Database.flush();
      return { showcase };
    }),
  ),
);

export default handler;
