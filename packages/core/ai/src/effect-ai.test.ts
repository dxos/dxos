//
// Copyright 2025 DXOS.org
//

import { AiLanguageModel, AiTool, AiToolkit } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Chunk, Console, Effect, Layer, Schema, Stream } from 'effect';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { type ContentBlock, DataType } from '@dxos/schema';

import { parseResponse } from './AiParser';
import { preprocessAiInput } from './AiPreprocessor';
import { AiService } from './deprecated/service';
import { AiServiceTestingPreset } from './testing';
import { getToolCalls, callTool } from './tools';
import { CalculatorToolkit, calculatorLayer } from './testing';

describe('effect AI client', () => {
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

        const toolkit = CalculatorToolkit;

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
          log.info('message', { message });
          history.push(message);

          const actualToolkit = Effect.isEffect(toolkit)
            ? yield* toolkit as unknown as Effect.Effect<AiToolkit.ToHandler<any>>
            : (toolkit as unknown as AiToolkit.ToHandler<any>);
          const toolCalls = getToolCalls(message);
          if (toolCalls.length === 0) {
            break;
          }

          const toolResults: ContentBlock.ToolResult[] = yield* Effect.forEach(toolCalls, (toolCall) =>
            callTool(actualToolkit, toolCall),
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
