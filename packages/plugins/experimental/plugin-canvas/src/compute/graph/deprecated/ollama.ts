//
// Copyright 2025 DXOS.org
//

import { type Ollama } from 'ollama';

import type { MessageImageContentBlock } from '@dxos/assistant';
import { log } from '@dxos/log';

import type { GptInput, GptOutput } from '../types';
import type { GptExecutor } from '../state-machine';

// TODO(burdon): Move to conductor.

export class OllamaGpt implements GptExecutor {
  // Images are not supported.
  public readonly imageCache = new Map<string, MessageImageContentBlock>();

  constructor(private readonly _ollama: Ollama) {}

  public async invoke({ systemPrompt, prompt, history = [] }: GptInput): Promise<GptOutput> {
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...history.map(({ role, message }) => ({ role, content: message })),
      { role: 'user', content: prompt },
    ];

    const result = await this._ollama.chat({ model: 'llama3.2', messages });
    log.info('gpt', { prompt, result });
    const { message, eval_count } = result;

    return {
      tokens: eval_count,
      result: [
        {
          role: 'user',
          message: prompt,
        },
        {
          role: message.role as any,
          message: message.content,
        },
      ],
    };
  }
}
