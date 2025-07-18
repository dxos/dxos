import { TestHelpers } from '@dxos/effect';
import { log } from '@dxos/log';
import { AiChat, AiInput, AiLanguageModel, AiTool, AiToolkit, type AiError } from '@effect/ai';
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { describe, it } from '@effect/vitest';
import { NodeHttpClient } from '@effect/platform-node';
import { Chunk, Config, Console, Context, Effect, Layer, Predicate, Schema, Stream } from 'effect';
import { parseGptStream } from './parser';
import { DataType, type ContentBlock } from '@dxos/schema';
import { Obj } from '@dxos/echo';
import { preprocessAiInput } from './preprocessor';
import { getToolCalls, runTool } from './tools';
import { AiService } from '../service';
import { AiModelNotAvailableError } from '../errors';
import { todo } from '@dxos/debug';

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
        let history: DataType.Message[] = [];
        history.push(
          Obj.make(DataType.Message, {
            sender: {
              role: 'user',
            },
            blocks: [{ _tag: 'text', text: 'What is 2 + 2?' }],
            created: new Date().toISOString(),
          }),
        );

        const toolkit = TestToolkit;

        do {
          const prompt = yield* preprocessAiInput(history);
          const blocks = yield* AiLanguageModel.streamText({
            prompt,
            toolkit,
            system: 'You are a helpful assistant.',
            disableToolCallResolution: true,
          }).pipe(parseGptStream(), Stream.runCollect, Effect.map(Chunk.toArray));
          const message = Obj.make(DataType.Message, {
            sender: {
              role: 'assistant',
            },
            blocks,
            created: new Date().toISOString(),
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
              sender: {
                role: 'user',
              },
              blocks: toolResults,
              created: new Date().toISOString(),
            }),
          );
        } while (true);
      },
      Effect.provide(toolkitLayer),
      Effect.provide(AiService.model('@anthropic/claude-3-5-sonnet-20241022')),

      /// Runtime
      Effect.provide(AiServiceRouter),
      Effect.provide(AnthropicLayer),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
    ),
  );
});

// TODO(dmaretskyi): Make this generic.
const AiServiceRouter = Layer.effect(
  AiService,
  Effect.gen(function* () {
    const anthropicClient = Layer.succeed(AnthropicClient.AnthropicClient, yield* AnthropicClient.AnthropicClient);
    return AiService.of({
      model: (model) => {
        switch (model) {
          case '@anthropic/claude-3-5-sonnet-20241022':
            return AnthropicLanguageModel.model('claude-3-5-sonnet-20241022').pipe(Layer.provide(anthropicClient));
          default:
            return Layer.fail(new AiModelNotAvailableError(model));
        }
      },
      get client(): never {
        throw new Error('Client not available');
      },
    });
  }),
);
