//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { parseResponse } from '../../AiParser';
import { preprocessPrompt } from '../../AiPreprocessor';

import { DEFAULT_LMSTUDIO_ENDPOINT } from './LMStudioResolver';

/**
 * To start the LM Studio server:
 * ```bash
 * ~/.lmstudio/bin/lms server start
 * ```
 */
describe.skip('lm-studio', () => {
  it.effect(
    'streaming',
    Effect.fn(
      function* ({ expect }) {
        const history: Message.Message[] = [
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            blocks: [
              {
                _tag: 'text',
                text: 'What kind of model are you.',
              },
            ],
          }),
        ];

        const prompt = yield* preprocessPrompt(history, {
          system: 'You are a helpful assistant. Be extremely brief with your answers.',
        });
        const blocks = yield* LanguageModel.streamText({
          prompt,
          disableToolCallResolution: true,
        }).pipe(
          parseResponse({
            onPart: Console.log,
          }),
          Stream.runCollect,
          Effect.map(Chunk.toArray),
        );

        const message = Obj.make(Message.Message, {
          created: new Date().toISOString(),
          sender: { role: 'assistant' },
          blocks,
        });

        const block = message.blocks[0];
        invariant(block._tag === 'text');
        expect(block.text).toContain('Google');
        log.info('message', { message });
      },
      // TODO(burdon): Use LMStudioResolver.
      Effect.provide(
        Layer.provide(
          // NOTE: Actual model name is ignored by server.
          OpenAiLanguageModel.model('google/gemma-3-27b'),
          OpenAiClient.layer({
            apiUrl: DEFAULT_LMSTUDIO_ENDPOINT,
          }).pipe(Layer.provide(FetchHttpClient.layer)),
        ),
      ),
    ),
  );
});
