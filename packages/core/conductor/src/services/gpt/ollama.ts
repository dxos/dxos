import { GptOutput } from '../gpt';

import type { Context } from 'effect';
import type { GptInput, GptService } from '../gpt';
import { ObjectId, type MessageImageContentBlock } from '@dxos/assistant';
import { type Ollama } from 'ollama';
import { Effect, Stream } from 'effect';
import { log } from '@dxos/log';

export class OllamaGpt implements Context.Tag.Service<GptService> {
  // Images are not supported.
  public readonly imageCache = new Map<string, MessageImageContentBlock>();

  constructor(private readonly _ollama: Ollama) {}

  public invoke({ systemPrompt, prompt, history = [] }: GptInput): Effect.Effect<GptOutput, never, never> {
    return Effect.promise<GptOutput>(async () => {
      const messages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...history.flatMap(({ role, content }) =>
          content.flatMap((content) => (content.type === 'text' ? [{ role, content: content.text }] : [])),
        ),
        { role: 'user', content: prompt },
      ];

      const result = await this._ollama.chat({ model: 'llama3.2', messages });
      log.info('gpt', { prompt, result });
      const { message, eval_count } = result;

      return {
        messages: [
          {
            id: ObjectId.random(),
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
          {
            id: ObjectId.random(),
            role: message.role as any,
            content: [{ type: 'text', text: message.content }],
          },
        ],
        tokenCount: eval_count,
        text: message.content,
        tokenStream: Stream.empty,
        cot: undefined,
        artifact: undefined,
      } satisfies GptOutput;
    });
  }
}
