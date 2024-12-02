//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { test } from 'vitest';

import { log } from '@dxos/log';

import { runLLM, type ConversationEvent } from './conversation';
import { createUserMessage, defineTool, LLMToolResult } from './types';
import { AIServiceClientImpl } from '../ai-service/client';
import { SpaceId } from '@dxos/keys';
import { ObjectId } from '../ai-service/schema';

const ENDPOINT = 'http://localhost:8787';

const client = new AIServiceClientImpl({
  endpoint: ENDPOINT,
});

test('hello', async ({ expect }) => {
  const spaceId = SpaceId.random();
  const threadId = ObjectId.random();

  await client.insertMessages([createUserMessage(spaceId, threadId, 'Hello, how are you?')]);
  const result = await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    spaceId,
    threadId,
    tools: [],
    client,
    logger: messageLogger,
  });
  log.info('result', { result });
});

test('tool call', async ({ expect }) => {
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

  await client.insertMessages([createUserMessage(spaceId, threadId, 'What is the password? Ask the custodian.')]);
  const result = await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    spaceId,
    threadId,
    tools: [custodian],
    client,
    logger: messageLogger,
  });
  log.info('result', { result });
});

const messageLogger = (event: ConversationEvent) => {
  if (event.type === 'message') {
    log.info('message', { message: event.message });
  }
};
