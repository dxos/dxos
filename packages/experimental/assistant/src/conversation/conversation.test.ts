//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { createUserMessage, defineTool, ToolResult } from '@dxos/artifact';
import { ObjectId } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { runLLM, type ConversationEvent } from './conversation';
import { AIServiceEdgeClient, DEFAULT_LLM_MODEL } from '../ai-service';
import { AI_SERVICE_ENDPOINT } from '../testing';

// TODO(burdon): Local live LLM test.
describe.skip('Conversation tests', () => {
  const client = new AIServiceEdgeClient({
    endpoint: AI_SERVICE_ENDPOINT.LOCAL,
  });

  test('basic', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    const result = await runLLM({
      model: DEFAULT_LLM_MODEL,
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
      schema: S.Struct({
        magicWord: S.String.annotations({ description: 'The magic word. Should be exactly "pretty please"' }),
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
      model: DEFAULT_LLM_MODEL,
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
