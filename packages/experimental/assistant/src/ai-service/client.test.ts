import { test } from 'vitest';
import { AIServiceClient, AIServiceClientImpl } from './client';
import { SpaceId } from '@dxos/keys';
import { ObjectId, type LLMTool } from './schema';
import { log } from '@dxos/log';
import { defineTool } from '../conversation/types';
import { Schema as S } from '@effect/schema';
import { toJsonSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

const ENDPOINT = 'http://localhost:8787';

test('client generation', async () => {
  const client = new AIServiceClientImpl({
    endpoint: ENDPOINT,
  });

  const spaceId = SpaceId.random();
  const threadId = ObjectId.random();

  await client.insertMessages([
    {
      id: ObjectId.random(),
      spaceId,
      threadId,
      role: 'user',
      content: [{ type: 'text', text: 'Hello' }],
    },
  ]);

  const stream = await client.generate({
    model: '@anthropic/claude-3-5-haiku-20241022',
    spaceId,
    threadId,
    systemPrompt: 'You are a poet',
    tools: [],
  });
  for await (const event of stream) {
    log.info('event', event);
  }

  log.info('full message', {
    message: await stream.complete(),
  });
});

test.only('tool calls', async () => {
  const client = new AIServiceClientImpl({
    endpoint: ENDPOINT,
  });

  const custodian: LLMTool = {
    name: 'custodian',
    description: 'Custodian can tell you the password if you say the magic word',
    parameters: toJsonSchema(
      S.Struct({
        magicWord: S.String.annotations({ description: 'The magic word. Should be exactly "pretty please"' }),
      }),
    ),
  };

  const spaceId = SpaceId.random();
  const threadId = ObjectId.random();

  await client.insertMessages([
    {
      id: ObjectId.random(),
      spaceId,
      threadId,
      role: 'user',
      content: [{ type: 'text', text: 'What is the password? Ask the custodian' }],
    },
  ]);

  const stream = await client.generate({
    model: '@anthropic/claude-3-5-haiku-20241022',
    spaceId,
    threadId,
    systemPrompt: 'You are a helpful assistant.',
    tools: [custodian],
  });
  for await (const event of stream) {
    log.info('event', event);
  }
  const [message] = await stream.complete();
  log.info('full message', {
    message,
  });
  await client.insertMessages([message]);

  const toolUse = message.content.find(({ type }) => type === 'tool_use')!;
  invariant(toolUse.type === 'tool_use');
  await client.insertMessages([
    {
      id: ObjectId.random(),
      spaceId,
      threadId,
      role: 'user',
      content: [{ type: 'tool_result', toolUseId: toolUse.id, content: 'password="The sky is gray"' }],
    },
  ]);

  const stream2 = await client.generate({
    model: '@anthropic/claude-3-5-haiku-20241022',
    spaceId,
    threadId,
    systemPrompt: 'You are a helpful assistant.',
    tools: [custodian],
  });
  for await (const event of stream2) {
    log.info('event', event);
  }
  const [message2] = await stream2.complete();
  log.info('full message', {
    message: message2,
  });
});
