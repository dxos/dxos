//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiSession } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';
import { Pipeline } from '@dxos/types';

import { makeGraphWriterHandler, makeGraphWriterToolkit } from './graph';

const TestLayer = AssistantTestLayer({});

describe('graph', () => {
  // let builder: EchoTestBuilder;
  // test('findRelatedSchema', async () => {
  //   const db = await createEchoDatabase();
  //   const relatedSchemas = await findRelatedSchema(db, Schema.Struct({}));
  // });

  const Toolkit = makeGraphWriterToolkit({ schema: [Pipeline.Pipeline] });
  const ToolkitLayer = makeGraphWriterHandler(Toolkit);

  it.effect.skip(
    'calculator',
    Effect.fn(
      function* (_) {
        const session = new AiSession();
        const toolkit = yield* Toolkit;
        const response = yield* session.run({
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
