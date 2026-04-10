//
// Copyright 2025 DXOS.org
//

// Operation handler implementation.
// Each handler file exports a default value so it can be lazy-loaded via
// `OperationHandlerSet.lazy(() => import('./create-exemplar-item'))`.
// The handler receives the validated input and returns an Effect.

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { ExemplarItem } from '#types';

import { CreateExemplarItem } from './definitions';

// `Operation.withHandler` wraps the operation definition with an implementation.
// The callback receives the validated input fields and must return an Effect
// that produces the output matching the operation's output schema.
const handler: Operation.WithHandler<typeof CreateExemplarItem> = CreateExemplarItem.pipe(
  Operation.withHandler(({ name }) =>
    Effect.sync(() => {
      const object = ExemplarItem.make({ name });
      return { object };
    }),
  ),
);

export default handler;
