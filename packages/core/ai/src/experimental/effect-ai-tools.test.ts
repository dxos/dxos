//
// Copyright 2025 DXOS.org
//

import { AiLanguageModel } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Chunk, Effect, Layer, Stream } from 'effect';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { parseResponse } from '../AiParser';
import { preprocessAiInput } from '../AiPreprocessor';
import * as AiService from '../AiService';
import { AiServiceTestingPreset, CalculatorToolkit, calculatorLayer } from '../testing';
import { callTools, getToolCalls } from '../tools';

describe('effect AI parser', () => {
  it.effect(
    'streaming',
    Effect.fn(
      function* ({ expect: _ }) {
        const toolkit = yield* CalculatorToolkit.pipe(Effect.provide(calculatorLayer));

        const history: DataType.Message[] = [];
        history.push(
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            blocks: [{ _tag: 'text', text: 'What is 2 + 2?' }],
          }),
        );

        do {
          const prompt = yield* preprocessAiInput(history);

          const blocks = yield* AiLanguageModel.streamText({
            prompt,
            toolkit,
            system: 'You are a helpful assistant.',
            disableToolCallResolution: true,
          }).pipe(parseResponse(), Stream.runCollect, Effect.map(Chunk.toArray));

          const message = Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks,
          });
          history.push(message);
          log.info('message', { message });

          const toolCalls = getToolCalls(message);
          if (toolCalls.length === 0) {
            break;
          }

          log.info('toolCalls', { toolCalls });
          const toolResults = yield* callTools(toolkit, toolCalls);

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
          AiService.model('@anthropic/claude-3-5-sonnet-20241022').pipe(
            Layer.provideMerge(AiServiceTestingPreset('direct')),
          ),
        ),
      ),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
    ),
  );
});
