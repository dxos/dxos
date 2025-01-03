//
// Copyright 2025 DXOS.org
//

import ollama from 'ollama';

import { AIServiceClientImpl, type Message, type MessageTextContentBlock } from '@dxos/assistant';
import { SpaceId } from '@dxos/client/echo';
import { ObjectId } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { raise } from '@dxos/debug';

import { Function, type FunctionCallback } from './Function';
import { type GptInput, type GptOutput } from '../../shapes';

// TODO(burdon): Fix abstraction: should just be Function.
export class GptFunction extends Function<GptInput, GptOutput> {
  override async invoke(input: GptInput) {
    switch (this._context?.model) {
      case '@ollama/llama-3-2-3b': {
        return callOllama(input);
      }
      case '@anthropic/claude-3-5-sonnet-20241022': {
        return callEdge(input);
      }
      default:
        return raise(new Error(`invalid model: ${}`));
    }
  }
}

//
// Ollama
//

const callOllama: FunctionCallback<GptInput, GptOutput> = async ({ systemPrompt, prompt, history = [] }) => {
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

//
// EDGE
//

const callEdge: FunctionCallback<GptInput, GptOutput> = async ({ systemPrompt, prompt, history = [] }) => {
  const spaceId = SpaceId.random(); // TODO(dmaretskyi): Use spaceId from the context.
  const threadId = ObjectId.random();

  const messages: Message[] = [
    ...history.map(({ role, message }) => ({
      id: ObjectId.random(),
      spaceId,
      threadId,
      role: role === 'system' ? 'user' : role,
      content: [
        {
          type: 'text' as const,
          text: message,
        },
      ],
    })),
    {
      id: ObjectId.random(),
      spaceId,
      threadId,
      role: 'user',
      content: [
        {
          type: 'text' as const,
          text: prompt,
        },
      ],
    },
  ];

  await aiServiceClient.insertMessages(messages);

  log.info('gpt', { systemPrompt, prompt, history });
  const output = await aiServiceClient.generate({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    spaceId,
    threadId,
    tools: [],
    systemPrompt,
  });

  // TODO(dmaretskyi): output.complete() never resolves if we don't consume the stream. This shouldn't be necessary.
  queueMicrotask(async () => {
    for await (const event of output) {
      log.info('up', { event });
    }
  });

  const [resultMessage] = await output.complete();
  log.info('gpt', { resultMessage });

  return {
    result: [
      {
        role: 'user',
        message: prompt,
      },
      {
        role: 'assistant',
        message: (resultMessage.content.findLast(({ type }) => type === 'text') as MessageTextContentBlock)?.text ?? '',
      },
    ],
    tokens: 0,
  };
};

const AI_SERVICE_ENDPOINT = 'http://localhost:8787';

const aiServiceClient = new AIServiceClientImpl({
  endpoint: AI_SERVICE_ENDPOINT,
});
