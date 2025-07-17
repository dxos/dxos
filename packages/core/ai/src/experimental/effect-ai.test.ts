import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { AiChat, AiInput, AiLanguageModel, AiTool, AiToolkit } from '@effect/ai';
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { describe, it } from '@effect/vitest';
import { NodeHttpClient } from '@effect/platform-node';
import { Chunk, Config, Console, Effect, Layer, Schema, Stream } from 'effect';
import { parseGptStream } from './parser';
import { DataType, type ContentBlock } from '@dxos/schema';
import { Obj } from '@dxos/echo';
import { preprocessAiInput } from './preprocessor';

const AnthropicLayer = AnthropicClient.layerConfig({
  apiKey: Config.redacted('ANTHROPIC_API_KEY'),
}).pipe(Layer.provide(NodeHttpClient.layerUndici));

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
  Calculator: ({ input }) =>
    Effect.gen(function* () {
      const result = (() => {
        // Restrict to basic arithmetic operations for safety.
        const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
        log.info('calculate', { sanitizedInput });

        // eslint-disable-next-line no-new-func
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
        const languageModel = yield* AiLanguageModel.AiLanguageModel;

        const userMessage = Obj.make(DataType.Message, {
          sender: {
            role: 'user',
          },
          blocks: [{ _tag: 'text', text: 'What is 2 + 2?' }],
          created: new Date().toISOString(),
        });
        const prompt = yield* preprocessAiInput([userMessage]);
        log.info('prompt', { prompt });
        const blocks = yield* languageModel
          .streamText({
            prompt,
            toolkit: TestToolkit,
            system: 'You are a helpful assistant.',
            disableToolCallResolution: true,
          })
          .pipe(parseGptStream(), Stream.runCollect, Effect.map(Chunk.toArray));
        const message = Obj.make(DataType.Message, {
          sender: {
            role: 'assistant',
          },
          blocks,
          created: new Date().toISOString(),
        });

        log.info('message', { message });
      },
      Effect.provide(toolkitLayer),
      Effect.provide(AnthropicLanguageModel.model('claude-3-5-sonnet-latest')),
      Effect.provide(AnthropicLayer),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
    ),
  );
});
