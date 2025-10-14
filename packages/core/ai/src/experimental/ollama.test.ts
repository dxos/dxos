//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Test from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { parseResponse } from '../AiParser';
import { preprocessPrompt } from '../AiPreprocessor';
import { tapHttpErrors } from '../testing';

import { processMessages } from './testing';

const OLLAMA_ENDPOINT = 'http://localhost:11434/v1';

Test.describe('ollama', () => {
  Test.it.effect(
    'streaming',
    Effect.fn(
      function* (_) {
        const history: DataType.Message[] = [];
        history.push(
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            blocks: [{ _tag: 'text', text: 'What is 2 + 2?' }],
          }),
        );

        const prompt = yield* preprocessPrompt(history, {
          system: 'You are a helpful assistant.',
        });
        const blocks = yield* LanguageModel.streamText({
          prompt,
          disableToolCallResolution: true,
        }).pipe(parseResponse(), Stream.runCollect, Effect.map(Chunk.toArray));
        const message = Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: { role: 'assistant' },
          blocks,
        });
        log.info('message', { message });
        history.push(message);
      },
      Effect.provide(
        Layer.provide(
          OpenAiLanguageModel.model('deepseek-r1' as any),
          OpenAiClient.layer({
            apiUrl: OLLAMA_ENDPOINT,
          }).pipe(Layer.provide(FetchHttpClient.layer)),
        ),
      ),
      TestHelpers.taggedTest('llm'),
    ),
  );

  Test.it.effect(
    'tools',
    Effect.fn(
      function* (_) {
        yield* processMessages({
          messages: [
            Obj.make(DataType.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: 'What is 2 + 2?' }],
            }),
          ],
        });
      },
      Effect.provide(
        Layer.provide(
          OpenAiLanguageModel.model('qwen2.5:14b' as any),
          OpenAiClient.layer({
            apiUrl: OLLAMA_ENDPOINT,
            transformClient: tapHttpErrors,
          }).pipe(Layer.provide(FetchHttpClient.layer)),
        ),
      ),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
