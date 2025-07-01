import { describe, expect, it, test, type TaskContext } from '@effect/vitest';
import { Cause, Effect, Exit, Fiber } from 'effect';

import { defineTool, Message, OllamaAiServiceClient, ToolTypes } from '@dxos/ai';

import { createTestServices } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { ValueBag } from '../../types';
import { GptInput, gptNode } from './node';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { TestRuntime } from '../../testing';
import { Obj, Ref } from '@dxos/echo';

const ENABLE_LOGGING = false;

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('gptNode', () => {
  it.effect('gpt simple', (ctx) =>
    Effect.gen(function* () {
      const input: GptInput = {
        prompt: 'What is the meaning of life? Answer in 10 words or less.',
      };
      const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
        Effect.flatMap(ValueBag.unwrap),
        Effect.provide(
          createTestServices({
            ai: {
              provider: 'dev',
            },
            logging: {
              enabled: ENABLE_LOGGING,
            },
          }).createLayer(),
        ),
      );
      log.info('output', { output });
      expect(typeof output.text).toBe('string');
      expect(output.text.length).toBeGreaterThan(10);
    }).pipe(Effect.scoped),
  );

  it.effect(
    'gpt with history',
    Effect.fn(function* () {
      const builder = yield* Effect.promise(() => new EchoTestBuilder().open());
      const { db, queues } = yield* Effect.promise(() => builder.createDatabase());
      const services = createTestServices({
        ai: {
          provider: 'edge',
        },
        db,
        queues,
      });

      const conversation = queues.create();
      yield* Effect.promise(() =>
        conversation.append([
          Obj.make(Message, {
            role: 'user',
            content: [{ type: 'text', text: 'I have 10 apples in my bag' }],
          }),
        ]),
      );
      const input: GptInput = {
        prompt: 'I have twice as many oranges as apples. How many oranges do I have?',
        conversation: Ref.fromDXN(conversation.dxn),
      };

      const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
        Effect.flatMap(ValueBag.unwrap),
        Effect.provide(services.createLayer()),
        Effect.scoped,
      );
      log.info('output', { output });
      expect(typeof output.text).toBe('string');
      expect(output.text.length).toBeGreaterThan(10);

      const conversationMessages = yield* Effect.promise(() => queues.get<Message>(conversation.dxn).queryObjects());
      log.info('conversationMessages', { conversationMessages });
      expect(conversationMessages.at(-1)?.role).toEqual('assistant');
    }),
    60_000,
  );

  it.scoped(
    'gpt with image gen',
    Effect.fn(function* (ctx) {
      if (!(yield* Effect.promise(() => OllamaAiServiceClient.isRunning()))) {
        ctx!.skip();
        return;
      }

      const input: GptInput = {
        prompt: 'A beautiful sunset over a calm ocean',
        tools: [
          defineTool('testing', {
            name: 'text-to-image',
            type: ToolTypes.TextToImage,
            options: {
              model: '@testing/kitten-in-bubble',
            },
          }),
        ],
      };
      const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
        Effect.flatMap(ValueBag.unwrap),
        Effect.provide(
          createTestServices({
            ai: {
              provider: 'ollama',
            },
            logging: {
              enabled: ENABLE_LOGGING,
            },
          }).createLayer(),
        ),
      );
      log.info('output', { output });
      log.info('artifact', { artifact: output.artifact });
      expect(output.artifact).toBeDefined();
    }),
    60_000,
  );
});
