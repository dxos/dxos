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
import { CredentialsService, TracingService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { NoHandlerError, Operation } from '@dxos/operation';

import { ValueBag } from './compute';

const OperationServiceLayerTest = Layer.succeed(Operation.Service, {
  invoke: (op: Operation.Definition.Any) => Effect.fail(new NoHandlerError(op.meta.key)),
  schedule: () => Effect.void,
  invokePromise: async () => ({ error: new Error('Not implemented in test') }),
} as Operation.OperationService);

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(OperationServiceLayerTest),
  Layer.provideMerge(
    Layer.mergeAll(
      TestAiService(),
      TestDatabaseLayer(),
      CredentialsService.configuredLayer([]),
      Feed.notAvailable,
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
