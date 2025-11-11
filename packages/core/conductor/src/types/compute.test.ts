//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe } from 'vitest';

import { TestAiService } from '@dxos/ai/testing';
import { TestHelpers } from '@dxos/effect';
import { ComputeEventLogger, CredentialsService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';

import { ValueBag } from './compute';

const TestLayer = Layer.mergeAll(ComputeEventLogger.layerFromTracing).pipe(
  Layer.provideMerge(FunctionInvocationServiceLayerTest()),
  Layer.provideMerge(
    Layer.mergeAll(
      TestAiService(),
      TestDatabaseLayer(),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
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
