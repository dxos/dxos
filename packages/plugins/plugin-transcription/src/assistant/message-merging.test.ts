//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_EDGE_MODEL, AIServiceEdgeClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { type TextContentBlock } from '@dxos/artifact';
import { AISession } from '@dxos/assistant';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';

// Generate bunch of complex messages.
const messages: string[] = [
  // Control message.
  'Hello, every body. We will talk about quantum entanglement today',

  // Two sentences in one message.
  'hello, every body we will talk about quantum entanglement today',

  // Sentence broken into pieces.
  'quantum entanglement',
  'is one of the most...',
  'perplexing and fascinating phenomena',
  'in modern physics',

  // Two sentences without separators.
  'it challenges our classical intuitions about how the universe works and forces us to reconsider our assumptions about space, time, and information',
  'at its core, quantum entanglement refers to a peculiar connection between two or more particles in such a way that the state of one particle instantly...',
  'determines the state of the other, no matter how far apart they may be — even if they are light-years away',

  // 2 sentences are merged.
  'this seemingly instantaneous correlation between distant particles has baffled physicists since the early 20th century to understand entanglement, we',
  'first need to touch on the fundamentals of quantum mechanics',

  // No punctuation.
  'in classical physics objects have well-defined properties such as position speed and momentum',
];

const prompt = `
You are observing a real-time transcript of a single person speaking.

The transcription is delivered in chunks of 10 seconds or less. As a result, individual sentences may be split across multiple messages, or multiple sentences may appear within a single message. Additionally, due to the real-time nature of transcription, punctuation and capitalization may be incorrect or missing.

# Task Description:
- Your task is to identify and reconstruct broken or incomplete sentences, combining fragments into coherent and grammatically correct sentences where appropriate.

# Output Format:
  - Provide your output in the following JSON format:
  {
    "sentences": <array of strings>,
    "leftover": <string>,
  }
  - You should not output anything more than json object (no explanation, no comments, no notes, no nothing).

  # Sentence Handling Rules:
  - Output each complete sentence as a separate string in the 'sentences' array, in the original order.
  - If you encounter a message or fragment that does not form a complete sentence, place it in the 'leftover' field.
  - Treat single words or short phrases as incomplete on the first iteration.
  - If a fragment seems like a title, place it in 'leftover' unless it is clearly followed by supporting context in subsequent messages.
  - If a sentence is clearly incomplete but context suggests it will not be completed in future messages (e.g., a malformed or abandoned sentence), you should include it in 'sentences'.
  
  # Punctuation and Capitalization:
  - Do not rely on the original punctuation and capitalization—they may be incorrect.
  - Use logical reasoning to restore appropriate punctuation (e.g., period, comma, question mark, exclamation mark) and capitalization as needed.
  
  # Restrictions:
  - Do not alter the order of the original messages; maintain the original flow of speech.
  - Do not interpret or infer meaning beyond sentence reconstruction.
  - Do not add or remove any words or phrases.
  `;

const messageMerging = async (blocks: string[]): Promise<{ sentences: string[]; leftover: string }> => {
  log.info('input', { blocks });
  const aiClient = new AIServiceEdgeClient({ endpoint: AI_SERVICE_ENDPOINT.REMOTE });
  const session = new AISession({ operationModel: 'configured' });

  const response = await session.run({
    generationOptions: { model: DEFAULT_EDGE_MODEL },
    client: aiClient,
    tools: [],
    artifacts: [],
    history: [
      {
        id: ObjectId.random(),
        role: 'user',
        content: blocks.map((block) => ({ type: 'text', text: block })),
      },
    ],
    prompt,
  });

  try {
    const json = JSON.parse((response.at(-1)!.content[0] as TextContentBlock).text ?? '{}');
    return json;
  } catch (error) {
    log.error('Error parsing JSON', { response, content: response.at(-1)!.content[0] });
    return { sentences: [], leftover: '' };
  }
};

describe.skip('MessageProcessing', () => {
  test('messages merging', { timeout: 120_000 }, async () => {
    let buffer = '';
    const sentences: string[] = [];
    for (const message of messages) {
      const mergedMessages = await messageMerging(buffer ? [buffer, message] : [message]);
      buffer = mergedMessages.leftover ?? mergedMessages.sentences.at(-1) ?? '';
      sentences.push(...mergedMessages.sentences);

      log.info('message', { mergedMessages });
    }
    log.info('sentences', { sentences });
  });
});
