//
// Copyright 2024 DXOS.org
//

import { type Ai } from '@cloudflare/ai';

// TODO(burdon): Stream via modelfusion API.
// https://playground.ai.cloudflare.com/
// https://developers.cloudflare.com/workers-ai/
// https://developers.cloudflare.com/workers-ai/tutorials/build-a-retrieval-augmented-generation-ai/#3-adding-the-ai-binding

export const chat = async (ai: Ai) => {
  const answer = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
    // stream: true,
    // max_tokens: 256,
    messages: [{ role: 'user', content: 'What is the square root of 9?' }],
  });

  return answer;
};
