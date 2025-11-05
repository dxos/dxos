//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import type { EchoDatabase, QueueFactory } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { type ServiceContainer } from '@dxos/functions';
import { createTestServices } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { ValueBag } from '../../types';

import { type GptInput, gptNode } from './node';

const ENABLE_LOGGING = true;

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('gptNode', () => {
  describe('common', () => {
    let builder: EchoTestBuilder, services: ServiceContainer, db: EchoDatabase, queues: QueueFactory;
    beforeEach(async (ctx) => {
      builder = await new EchoTestBuilder().open();
      ({ db, queues } = await builder.createDatabase());
      services = createTestServices({
        ai: {
          provider: 'edge',
        },
        db,
        queues,
        logging: {
          enabled: ENABLE_LOGGING,
        },
      });
    });
    afterEach(async () => {
      await builder.close();
    });

    it.effect(
      'gpt simple',
      Effect.fn(function* () {
        const input: GptInput = {
          prompt: 'What is the meaning of life? Answer in 10 words or less.',
        };
        const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
          Effect.flatMap(ValueBag.unwrap),
          Effect.provide(services.createLayer()),
          Effect.scoped,
        );
        log.info('output', { output });
        expect(typeof output.text).toBe('string');
        expect(output.text.length).toBeGreaterThan(10);
      }),
      60_000,
    );

    it.effect(
      'gpt with history',
      Effect.fn(function* () {
        const conversation = queues.create();
        yield* Effect.promise(() =>
          conversation.append([
            Obj.make(DataType.Message.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: 'I have 10 apples in my bag' }],
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

        const conversationMessages = yield* Effect.promise(() =>
          queues.get<DataType.Message.Message>(conversation.dxn).queryObjects(),
        );
        log.info('conversationMessages', { conversationMessages });
        expect(conversationMessages.at(-1)?.sender.role).toEqual('assistant');
      }),
      60_000,
    );
  });

  // it.skip(
  //   'ollama image gen',
  //   Effect.fn(function* (ctx) {
  //     const _textToImageTool = defineTool('testing', {
  //       name: 'text-to-image',
  //       type: ToolTypes.TextToImage,
  //       options: {
  //         model: '@testing/kitten-in-bubble',
  //       },
  //     });

  //     const input: GptInput = {
  //       prompt: 'A beautiful sunset over a calm ocean',
  //       tools: [ToolId.make('testing/text-to-image')],
  //     };
  //     const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
  //       Effect.flatMap(ValueBag.unwrap),
  //       Effect.provide(
  //         createTestServices({
  //           ai: {
  //             provider: 'ollama',
  //           },
  //           logging: {
  //             enabled: ENABLE_LOGGING,
  //           },
  //         }).createLayer(),
  //       ),
  //       Effect.scoped,
  //     );
  //     log.info('output', { output });
  //     log.info('artifact', { artifact: output.artifact });
  //     expect(output.artifact).toBeDefined();
  //   }),
  //   60_000,
  // );
});
