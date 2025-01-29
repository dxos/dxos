//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { describe, test } from 'vitest';

import { ObjectId } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { runLLM, type ConversationEvent } from './conversation';
import { createUserMessage, defineTool, LLMToolResult } from './types';
import { AIServiceClientImpl } from '../ai-service';
import { AI_SERVICE_ENDPOINT } from '../testing';

describe.skip('Conversation tests', () => {
  const client = new AIServiceClientImpl({
    endpoint: AI_SERVICE_ENDPOINT.LOCAL,
  });

  test('hello', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    const result = await runLLM({
      model: '@anthropic/claude-3-5-sonnet-20241022',
      history: [createUserMessage(spaceId, threadId, 'Hello, how are you?')],
      tools: [],
      client,
      logger: messageLogger,
    });
    log('result', { result });
  });

  test.only('tool call', async ({ expect }) => {
    const custodian = defineTool({
      name: 'custodian',
      description: 'Custodian can tell you the password if you say the magic word',
      schema: S.Struct({
        magicWord: S.String.annotations({ description: 'The magic word. Should be exactly "pretty please"' }),
      }),
      execute: async ({ magicWord }) => {
        if (magicWord === 'pretty please') {
          return LLMToolResult.Success('The password is: "The sky is gray"');
        } else {
          return LLMToolResult.Error('Wrong magic word');
        }
      },
    });

    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    const result = await runLLM({
      model: '@anthropic/claude-3-5-sonnet-20241022',
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
