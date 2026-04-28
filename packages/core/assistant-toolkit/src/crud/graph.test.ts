//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { OpaqueToolkit } from '@dxos/ai';
import { AiRequest, ToolExecutionServices } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';
import { Pipeline } from '@dxos/types';

import { makeGraphWriterHandler, makeGraphWriterToolkit } from './graph';

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(ToolExecutionServices),
  Layer.provideMerge(AssistantTestLayer({})),
);

describe('graph', () => {
  const Toolkit = makeGraphWriterToolkit({ schema: [Pipeline.Pipeline] });
  const ToolkitLayer = makeGraphWriterHandler(Toolkit);

  it.effect.skip(
    'calculator',
    Effect.fn(
      function* (_) {
        const request = new AiRequest();
        const toolkit = yield* OpaqueToolkit.fromContext(Toolkit);
        const response = yield* request.run({
          toolkit,
          prompt: 'What is 10 + 20?',
        });

        log.info('response', { response });
      },
      Effect.provide(Layer.mergeAll(TestLayer, ToolkitLayer)),
      TestHelpers.provideTestContext,
    ),
  );
});
