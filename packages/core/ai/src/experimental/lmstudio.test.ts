import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';
import { AiLanguageModel } from '@effect/ai';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { FetchHttpClient } from '@effect/platform';
import { describeWrapped, it } from '@effect/vitest';
import { Chunk, Console, Effect, Layer, Stream } from 'effect';
import { parseGptStream } from './AiParser';
import { preprocessAiInput } from './AiPreprocessor';

const OpenAiLayer = OpenAiClient.layer({
  apiUrl: 'http://localhost:1234/v1',
}).pipe(Layer.provide(FetchHttpClient.layer));

describeWrapped('lmstudio', () => {
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

        const prompt = yield* preprocessAiInput(history);
        const blocks = yield* AiLanguageModel.streamText({
          prompt,
          system: 'You are a helpful assistant.',
          disableToolCallResolution: true,
        }).pipe(
          parseGptStream({
            onPart: Console.log,
          }),
          Stream.runCollect,
          Effect.map(Chunk.toArray),
        );
        const message = Obj.make(DataType.Message, {
          sender: {
            role: 'assistant',
          },
          blocks,
          created: new Date().toISOString(),
        });
        log.info('message', { message });
        history.push(message);
      },
      Effect.provide(Layer.provide(OpenAiLanguageModel.model('google/gemma-3-12b' as any), OpenAiLayer)),
    ),
  );
});
