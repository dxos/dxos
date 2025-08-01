//
// Copyright 2025 DXOS.org
//

import { AiLanguageModel } from '@effect/ai';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import { Chunk, Console, Effect, Layer, Stream } from 'effect';

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { preprocessAiInput } from './AiPreprocessor';
import { parseGptStream } from './experimental/AiParser';

describe.runIf(process.env.DX_TEST_TAGS?.includes('llm'))('ollama', () => {
  it.effect(
    'streaming',
    Effect.fn(
      function* ({ expect }) {
        const history: DataType.Message[] = [];
        history.push(
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            blocks: [{ _tag: 'text', text: 'What is 2 + 2?' }],
          }),
        );

        const prompt = yield* preprocessAiInput(history);
        const blocks = yield* AiLanguageModel.streamText({
          prompt,
          system: 'You are a helpful assistant.',
          disableToolCallResolution: true,
        }).pipe(parseGptStream({}), Stream.runCollect, Effect.map(Chunk.toArray));
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
            apiUrl: 'http://localhost:11434/v1/',
          }).pipe(Layer.provide(FetchHttpClient.layer)),
        ),
      ),
    ),
  );
});

// 