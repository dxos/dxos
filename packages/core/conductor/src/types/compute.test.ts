//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe } from 'vitest';

import { TestAiService } from '@dxos/ai/testing';
import { Feed } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { CredentialsService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/compute-runtime/testing';
import { Operation, OperationRegistry } from '@dxos/operation';

import { ValueBag } from './compute';

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.succeed(Operation.Service, {
        invoke: () => Effect.die('Operation.Service not available in test.'),
        schedule: () => Effect.die('Operation.Service not available in test.'),
        invokePromise: async () => ({ error: new Error('Not available') }),
      } as any),
      Layer.succeed(OperationRegistry.Service, { resolve: () => Effect.succeed(undefined) } as any),
    ),
  ),
  Layer.provideMerge(
    Layer.mergeAll(TestAiService(), TestDatabaseLayer(), CredentialsService.configuredLayer([]), Feed.notAvailable),
  ),
);

describe('ValueBag', () => {
  it.scoped(
    'ValueBag.unwrap',
    Effect.fnUntraced(
      function* ({ expect }) {
        const bag = ValueBag.make({ a: 1, b: 2 });
        const result = yield* ValueBag.unwrap(bag);
        expect(result).toEqual({ a: 1, b: 2 });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
