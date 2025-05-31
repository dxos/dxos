//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { type Message } from '@dxos/artifact';
import { AIServiceEdgeClient, AISession, DEFAULT_EDGE_MODEL } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT, ConsolePrinter } from '@dxos/assistant/testing';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';

// Generate bunch of complex messages.
const messages: Message[] = [
  // Control message.
  'Hello, every body. We will talk about quantum entanglement today.',

  // Sentence broken into pieces.
  'Quantum entanglement',
  'is one of the most...',
  'perplexing and fascinating phenomena',
  'in modern physics',

  // Two sentences without separators.
  'It challenges our classical intuitions about how the universe works and forces us to reconsider our assumptions about space, time, and information',
  'at its core, quantum entanglement refers to a peculiar connection between two or more particles in such a way that the state of one particle instantly...',
  'determines the state of the other, no matter how far apart they may be — even if they are light-years away',

  // 2 sentences are merged.
  'This seemingly instantaneous correlation between distant particles has baffled physicists since the early 20th century. To understand entanglement, we',
  'first need to touch on the fundamentals of quantum mechanics.',

  // No punctuation.
  'In classical physics objects have well-defined properties such as position speed and momentum',
].map((message) => ({
  id: ObjectId.random(),
  role: 'user',
  content: [{ type: 'text', text: message }],
}));

const prompt = `
  You are observing a transcription of a conversation.
  Because of the way the transcription is generated, the sentences could be broken into different messages.
  Your task is to find broken sentences and merge them into a coherent messages.
  You do not need to understand the meaning of the messages.

  Follow these guidelines carefully:
  - Do not add any new sentences.
  - Do not remove any existing sentences.
  - Do not change the wording of the original messages.
  - Refine punctuation.
  - Do not put all sentences into a single message.
`;

describe.only('MessageProcessing', () => {
  test('messages merging', { timeout: 120_000 }, async () => {
    const aiClient = new AIServiceEdgeClient({ endpoint: AI_SERVICE_ENDPOINT.REMOTE });
    const session = new AISession({ operationModel: 'configured' });

    const printer = new ConsolePrinter();
    session.message.on((message) => printer.printMessage(message));
    session.userMessage.on((message) => printer.printMessage(message));
    session.block.on((block) => printer.printContentBlock(block));

    const response = await session.run({
      client: aiClient,
      tools: [],
      artifacts: [],
      requiredArtifactIds: [],
      history: messages,
      generationOptions: { model: DEFAULT_EDGE_MODEL },
      prompt,
    });

    log.info('newMessages', { newMessages: response.at(-1) });
  });
});
