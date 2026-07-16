//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Trace } from '@dxos/compute';
import { type ServiceContainer } from '@dxos/compute-runtime';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { createTestServices } from '@dxos/edge-compute/testing';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { ComputeNodeContext, ValueBag } from '../../types';
import { type GptInput, gptNode } from './gpt';

const ENABLE_LOGGING = true;

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('gptNode', () => {
  describe('common', () => {
    let builder: EchoTestBuilder, services: ServiceContainer, db: EchoDatabase;
    beforeEach(async (ctx) => {
      builder = await new EchoTestBuilder().open();
      ({ db } = await builder.createDatabase());
      services = createTestServices({
        ai: {
          provider: 'edge',
        },
        db,
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
      Effect.fnUntraced(
        function* () {
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
          ]).pipe(Effect.provide(services.createLayer()));
          const input: GptInput = {
            prompt: 'I have twice as many oranges as apples. How many oranges do I have?',
            conversation: Ref.make(conversation),
          };

          const output = yield* gptNode.exec!(ValueBag.make(input)).pipe(
            Effect.flatMap(ValueBag.unwrap),
            Effect.provide(services.createLayer()),
            Effect.scoped,
          );
          log.info('output', { output });
          expect(typeof output.text).toBe('string');
          expect(output.text.length).toBeGreaterThan(10);

          const conversationMessages = yield* Feed.query(conversation, Filter.type(Message.Message)).run.pipe(
            Effect.provide(services.createLayer()),
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
