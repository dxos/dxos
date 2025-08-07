//
// Copyright 2025 DXOS.org
//

import { AiLanguageModel, type AiToolkit } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Chunk, Effect, Layer, Stream } from 'effect';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { type ContentBlock, DataType } from '@dxos/schema';

import { parseResponse } from '../AiParser';
import { preprocessAiInput } from '../AiPreprocessor';
import * as AiService from '../AiService';
import { AiServiceTestingPreset, CalculatorToolkit, calculatorLayer } from '../testing';
import { callTool, getToolCalls } from '../tools';

describe('effect AI client', () => {
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

        do {
          const prompt = yield* preprocessAiInput(history);
          const blocks = yield* AiLanguageModel.streamText({
            prompt,
            toolkit: yield* CalculatorToolkit.pipe(Effect.provide(calculatorLayer)),
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

          const toolkit = CalculatorToolkit;
          const toolkitWithHandlers = Effect.isEffect(toolkit)
            ? yield* toolkit as unknown as Effect.Effect<AiToolkit.ToHandler<any>>
            : (toolkit as unknown as AiToolkit.ToHandler<any>);

          const toolCalls = getToolCalls(message);
          if (toolCalls.length === 0) {
            break;
          }

          const toolResults: ContentBlock.ToolResult[] = yield* Effect.forEach(toolCalls, (toolCall) =>
            callTool(toolkitWithHandlers, toolCall),
          );

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
