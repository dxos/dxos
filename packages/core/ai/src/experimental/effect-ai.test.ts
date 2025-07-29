//
// Copyright 2025 DXOS.org
//

import { AiLanguageModel, AiTool, AiToolkit } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Chunk, Console, Effect, Layer, Schema, Stream } from 'effect';

import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { DataType, type ContentBlock } from '@dxos/schema';

import { parseGptStream } from './AiParser';
import { preprocessAiInput } from './AiPreprocessor';
import { getToolCalls, runTool } from './tools';
import { AiService } from '../service';
import { AiServiceTestingPreset } from '../testing';

// Tool definitions.
class TestToolkit extends AiToolkit.make(
  AiTool.make('Calculator', {
    description: 'Basic calculator tool',
    parameters: {
      input: Schema.String.annotations({
        description: 'The calculation to perform.',
      }),
    },
    success: Schema.Struct({
      result: Schema.Number,
    }),
    failure: Schema.Never,
  }),
) {}

// Tool handlers.
const toolkitLayer = TestToolkit.toLayer({
  Calculator: Effect.fn(function* ({ input }) {
    const result = (() => {
      // Restrict to basic arithmetic operations for safety.
      const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
      log.info('calculate', { sanitizedInput });

      // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
      return Function(`"use strict"; return (${sanitizedInput})`)();
    })();

    // TODO(burdon): How to return an error.
    yield* Console.log(`Executing calculation: ${input} = ${result}`);
    return { result };
  }),
});

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

        const toolkit = TestToolkit;

        do {
          const prompt = yield* preprocessAiInput(history);
          const blocks = yield* AiLanguageModel.streamText({
            prompt,
            toolkit: yield* TestToolkit.pipe(Effect.provide(toolkitLayer)),
            system: 'You are a helpful assistant.',
            disableToolCallResolution: true,
          }).pipe(parseGptStream(), Stream.runCollect, Effect.map(Chunk.toArray));
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
            runTool(actualToolkit, toolCall),
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
          toolkitLayer,
          AiService.model('@anthropic/claude-3-5-sonnet-20241022').pipe(
            Layer.provideMerge(AiServiceTestingPreset('direct')),
          ),
        ),
      ),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
    ),
  );
});
