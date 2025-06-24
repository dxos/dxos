//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { ObjectId } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { runLLM, type ConversationEvent } from './conversation';
import { DEFAULT_EDGE_MODEL } from '../defs';
import { EdgeAiServiceClient } from '../service';
import { AI_SERVICE_ENDPOINT } from '../testing';
import { createUserMessage, createTool, ToolResult } from '../tools';

// TODO(burdon): Local live LLM test.
describe.skip('Conversation tests', () => {
  const aiClient = new EdgeAiServiceClient({
    endpoint: AI_SERVICE_ENDPOINT.LOCAL,
  });

  test('basic', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    const result = await runLLM({
      aiClient,
      model: DEFAULT_EDGE_MODEL,
      history: [createUserMessage(spaceId, threadId, 'Hello, how are you?')],
      tools: [],
      logger,
    });

    log('result', { result });
    expect(result.history.length).to.equal(2);
  });

  test('tool call', async ({ expect }) => {
    const custodian = createTool('testing', {
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
      aiClient,
      model: DEFAULT_EDGE_MODEL,
      history: [createUserMessage(spaceId, threadId, 'What is the password? Ask the custodian.')],
      tools: [custodian],
      logger,
    });
    log('result', { result });
  });

  const logger = (event: ConversationEvent) => {
    if (event.type === 'message') {
      log('message', { message: event.message });
    }
  };
});
