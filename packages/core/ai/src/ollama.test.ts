//
// Copyright 2025 DXOS.org
//

import { AiLanguageModel } from '@effect/ai';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { FetchHttpClient } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import { Chunk, Effect, Layer, Stream } from 'effect';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { type ContentBlock, DataType } from '@dxos/schema';

import { parseResponse } from './AiParser';
import { preprocessAiInput } from './AiPreprocessor';
import { TestingToolkit, testingLayer, tapHttpErrors } from './testing';
import { callTools, getToolCalls } from './tools';

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

        const prompt = yield* preprocessAiInput(history);
        const blocks = yield* AiLanguageModel.streamText({
          prompt,
          system: 'You are a helpful assistant.',
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
        const history: DataType.Message[] = [];
        history.push(
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            blocks: [{ _tag: 'text', text: 'What is 2 + 2?' }],
          }),
        );

        const toolkit = TestingToolkit;

        do {
          const prompt = yield* preprocessAiInput(history);
          const blocks = yield* AiLanguageModel.streamText({
            prompt,
            toolkit: yield* TestingToolkit.pipe(Effect.provide(testingLayer)),
            system: 'You are a helpful assistant.',
            disableToolCallResolution: true,
          }).pipe(parseResponse(), Stream.runCollect, Effect.map(Chunk.toArray));
          const message = Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks,
          });
          log.info('message', { message });
          history.push(message);

          const toolCalls = getToolCalls(message);
          if (toolCalls.length === 0) {
            break;
          }

          const toolkitWithHandlers = Effect.isEffect(toolkit) ? yield* toolkit : toolkit;
          const toolResults: ContentBlock.ToolResult[] = yield* callTools(toolkitWithHandlers, toolCalls);
          history.push(
            Obj.make(DataType.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user' },
              blocks: toolResults,
            }),
          );
        } while (true);
      },
      Effect.provide(
        Layer.mergeAll(
          testingLayer,
          Layer.provide(
            OpenAiLanguageModel.model('qwen2.5:14b' as any),
            OpenAiClient.layer({
              apiUrl: 'http://localhost:11434/v1/',
              transformClient: tapHttpErrors,
            }).pipe(Layer.provide(FetchHttpClient.layer)),
          ),
        ),
      ),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
