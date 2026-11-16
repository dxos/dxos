//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { CodeOperation } from '#types';

import { recordReview } from './spec-review.ts';

const handler: Operation.WithHandler<typeof CodeOperation.CreateSpecReview> = CodeOperation.CreateSpecReview.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ spec: specRef, content }) {
      const spec = yield* Database.load(specRef);
      const { review, created } = yield* recordReview(spec, content);
      yield* Database.flush();
      return { review: Ref.make(review), created };
    }),
  ),
);

export default handler;
