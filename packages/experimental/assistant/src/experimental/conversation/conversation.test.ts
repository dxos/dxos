//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { AI_SERVICE_ENDPOINT, DEFAULT_EDGE_MODEL, AIServiceEdgeClient } from '@dxos/ai';
import { createUserMessage, defineTool, ToolResult } from '@dxos/artifact';
import { ObjectId } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { runLLM, type ConversationEvent } from './conversation';

// TODO(burdon): Local live LLM test.
describe.skip('Conversation tests', () => {
  const client = new AIServiceEdgeClient({
    endpoint: AI_SERVICE_ENDPOINT.LOCAL,
  });

  test('basic', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    const result = await runLLM({
      model: DEFAULT_EDGE_MODEL,
      history: [createUserMessage(spaceId, threadId, 'Hello, how are you?')],
      tools: [],
      client,
      logger: messageLogger,
    });

    log('result', { result });
    expect(result.history.length).to.equal(2);
  });

  test('tool call', async ({ expect }) => {
    const custodian = defineTool('testing', {
      name: 'custodian',
      description: 'Custodian can tell you the password if you say the magic word',
      schema: Schema.Struct({
        magicWord: Schema.String.annotations({ description: 'The magic word. Should be exactly "pretty please"' }),
      }),
      execute: async ({ magicWord }) => {
        if (magicWord === 'pretty please') {
          return ToolResult.Success('The password is: "The sky is gray"');
        } else {
          return ToolResult.Error('Wrong magic word');
        }
      },
    });

    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    const result = await runLLM({
      model: DEFAULT_EDGE_MODEL,
      history: [createUserMessage(spaceId, threadId, 'What is the password? Ask the custodian.')],
      tools: [custodian],
      client,
      logger: messageLogger,
    });
    log('result', { result });
  });

  const messageLogger = (event: ConversationEvent) => {
    if (event.type === 'message') {
      log('message', { message: event.message });
    }
  };
});
