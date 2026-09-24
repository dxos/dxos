//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe } from 'vitest';

import { TestAiService } from '@dxos/ai/testing';
import { configuredCredentialsLayer } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { registryLayerNoop } from '@dxos/echo/testing';
import { TestHelpers } from '@dxos/effect/testing';

import { ValueBag } from './compute.ts';

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.succeed(Operation.Service, {
        invoke: () => Effect.die('Operation.Service not available in test.'),
        schedule: () => Effect.die('Operation.Service not available in test.'),
        invokePromise: async () => ({ error: new Error('Not available') }),
      } as any),
      registryLayerNoop,
    ),
  ),
  Layer.provideMerge(Layer.mergeAll(TestAiService(), TestDatabaseLayer(), configuredCredentialsLayer([]))),
);

describe('ValueBag', () => {
  it.effect(
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
