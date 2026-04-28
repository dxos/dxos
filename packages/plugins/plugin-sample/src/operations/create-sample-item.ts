//
// Copyright 2025 DXOS.org
//

// Operation handler implementation.
// Each handler file exports a default value so it can be lazy-loaded via
// `OperationHandlerSet.lazy(() => import('./create-sample-item'))`.
// The handler receives the validated input and returns an Effect.

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { SampleItem } from '#types';

import { CreateSampleItem } from './definitions';

// `Operation.withHandler` wraps the operation definition with an implementation.
// The callback receives the validated input fields and must return an Effect
// that produces the output matching the operation's output schema.
const handler: Operation.WithHandler<typeof CreateSampleItem> = CreateSampleItem.pipe(
  Operation.withHandler(({ name }) =>
    Effect.sync(() => {
      const object = SampleItem.make({ name });
      return { object };
    }),
  ),
);

export default handler;
