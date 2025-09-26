//
// Copyright 2025 DXOS.org
//

import { LanguageModel } from '@effect/ai';
import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import { FetchHttpClient } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import { Chunk, Effect, Layer, Stream } from 'effect';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { parseResponse } from '../AiParser';
import { preprocessPrompt } from '../AiPreprocessor';
import { tapHttpErrors } from '../testing';

import { processMessages } from './testing';

const OLLAMA_ENDPOINT = 'http://localhost:11434/v1';

describe('ollama', () => {
  it.effect(
    'streaming',
    Effect.fn(
      function* ({ expect: _ }) {
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

  it.effect(
    'tools',
    Effect.fn(
      function* ({ expect: _ }) {
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
