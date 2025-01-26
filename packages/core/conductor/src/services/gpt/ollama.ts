//
// Copyright 2025 DXOS.org
//

import type { Context } from 'effect';
import { Effect, Stream } from 'effect';
import { type Ollama } from 'ollama';

import { ObjectId, type MessageImageContentBlock } from '@dxos/assistant';
import { log } from '@dxos/log';

import { type GptInput, type GptOutput } from '../../nodes';
import { makeValueBag, unwrapValueBag, type ComputeEffect, type ValueBag } from '../../types';
import { type GptService } from './gpt';

export class OllamaGpt implements Context.Tag.Service<GptService> {
  // Images are not supported.
  public readonly imageCache = new Map<string, MessageImageContentBlock>();

  constructor(private readonly _ollama: Ollama) {}

  public invoke(inputs: ValueBag<GptInput>): ComputeEffect<ValueBag<GptOutput>> {
    return Effect.gen(this, function* () {
      const { systemPrompt, prompt, history = [] } = yield* unwrapValueBag(inputs);

      const messages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...history.flatMap(({ role, content }) =>
          content.flatMap((content) => (content.type === 'text' ? [{ role, content: content.text }] : [])),
        ),
        { role: 'user', content: prompt },
      ];

      const result = yield* Effect.promise(() => this._ollama.chat({ model: 'llama3.2', messages }));
      log.info('gpt', { prompt, result });
      const { message, eval_count } = result;

      return makeValueBag<GptOutput>({
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
      });
    });
  }
}
