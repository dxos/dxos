import { type Ollama } from 'ollama';
import type { GptExecutor } from '../state-machine';
import { log } from '@dxos/log';

export const callOllama =
  (ollama: Ollama): GptExecutor =>
  async ({ systemPrompt, prompt, history = [] }) => {
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...history.map(({ role, message }) => ({ role, content: message })),
      { role: 'user', content: prompt },
    ];

    const result = await ollama.chat({ model: 'llama3.2', messages });
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
  };
