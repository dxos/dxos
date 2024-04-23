//
// Copyright 2024 DXOS.org
//

import { type Ai } from '@cloudflare/ai';

import { log } from '@dxos/log';

export type ChatRequest = {
  messages: {
    role?: 'user' | 'system';
    content: string;
  }[];
};

// https://playground.ai.cloudflare.com/
// https://developers.cloudflare.com/workers-ai/
// https://developers.cloudflare.com/workers-ai/tutorials/build-a-retrieval-augmented-generation-ai/#3-adding-the-ai-binding

// https://developers.cloudflare.com/workers-ai/models/
// const model = '@cf/hermes-2-pro-mistral-7b'; // TODO(burdon): JSON.
const model = '@cf/mistral/mistral-7b-instruct-v0.1';

export const chat = async (ai: Ai, { messages }: ChatRequest) => {
  log.info('chat', { messages });
  const result = await ai.run(model, {
    max_tokens: 256,
    messages: messages.map(({ role = 'user', content }) => ({ role, content })),
  });

  return result;
};

// TODO(burdon): Interrupt.
export const chatStream = async (ai: Ai, { messages }: ChatRequest): Promise<ReadableStream> => {
  const result = (await ai.run(model, {
    stream: true,
    max_tokens: 256,
    messages: messages.map(({ role = 'user', content }) => ({ role, content })),
  })) as ReadableStream; // TODO(burdon): ???

  return result;
};
