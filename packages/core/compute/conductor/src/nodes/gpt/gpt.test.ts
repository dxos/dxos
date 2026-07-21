//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { type Credential, Operation, Trace } from '@dxos/compute';
import { type Database, Feed, Filter, Obj, Ref, type Registry } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { registryLayerNoop } from '@dxos/echo/testing';
import { createTestServices } from '@dxos/edge-compute/testing';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { ComputeNodeContext, ValueBag } from '../../types';
import { type GptInput, gptNode } from './gpt';

const ENABLE_LOGGING = true;

// `Operation.Service` stub — `gptNode` requires the tag in context but the tested paths do not
// invoke other operations, so any invocation dies loudly rather than silently no-oping.
const operationServiceLayer = Layer.succeed(Operation.Service, {
  invoke: () => Effect.die('Operation.Service not available in test.'),
  schedule: () => Effect.die('Operation.Service not available in test.'),
  invokePromise: async () => ({ error: new Error('Operation.Service not available in test.') }),
} satisfies Operation.OperationService);

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('gptNode', () => {
  describe('common', () => {
    let builder: EchoTestBuilder,
      db: EchoDatabase,
      testLayer: Layer.Layer<
        | AiService.AiService
        | Credential.CredentialsService
        | Database.Service
        | Trace.TraceService
        | Operation.Service
        | Registry.Service
      >;
    beforeEach(async (ctx) => {
      builder = await new EchoTestBuilder().open();
      ({ db } = await builder.createDatabase());
      testLayer = Layer.mergeAll(
        createTestServices({ db, logging: { enabled: ENABLE_LOGGING } }),
        AiService.notAvailable,
        operationServiceLayer,
        registryLayerNoop,
      );
    });
    afterEach(async () => {
      await builder.close();
    });

    it.effect(
      'gpt simple',
      Effect.fnUntraced(
        function* () {
          const input: GptInput = {
            prompt: 'What is the meaning of life? Answer in 10 words or less.',
          };
          const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
            Effect.flatMap(ValueBag.unwrap),
            Effect.provide(testLayer),
            Effect.scoped,
          );
          log.info('output', { output });
          expect(typeof output.text).toBe('string');
          expect(output.text.length).toBeGreaterThan(10);
        },
        Effect.provide(Trace.writerLayerNoop),
        Effect.provide(ComputeNodeContext.layerNoop),
      ),
      60_000,
    );

    it.effect(
      'gpt with history',
      Effect.fnUntraced(
        function* () {
          const conversation = db.add(Feed.make());
          yield* Feed.append(conversation, [
            Obj.make(Message.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: 'I have 10 apples in my bag' }],
            }),
          ]).pipe(Effect.provide(testLayer));
          const input: GptInput = {
            prompt: 'I have twice as many oranges as apples. How many oranges do I have?',
            conversation: Ref.make(conversation),
          };

          const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
            Effect.flatMap(ValueBag.unwrap),
            Effect.provide(testLayer),
            Effect.scoped,
          );
          log.info('output', { output });
          expect(typeof output.text).toBe('string');
          expect(output.text.length).toBeGreaterThan(10);

          const conversationMessages = yield* Feed.query(conversation, Filter.type(Message.Message)).run.pipe(
            Effect.provide(testLayer),
          );
          log.info('conversationMessages', { conversationMessages });
          expect(conversationMessages.at(-1)?.sender.role).toEqual('assistant');
        },
        Effect.provide(Trace.writerLayerNoop),
        Effect.provide(ComputeNodeContext.layerNoop),
      ),
      60_000,
    );
  });
});
