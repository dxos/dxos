import { test } from 'vitest';
import { AIServiceClient } from './client';
import { SpaceId } from '@dxos/keys';
import { ObjectId } from './schema';
import { log } from '@dxos/log';

const ENDPOINT = 'http://localhost:8787';

test('client generation', async () => {
  const client = new AIServiceClient({
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
    threadId,
    systemPrompt: 'You are a poet',
  });
  for await (const event of stream) {
    log.info('event', event);
  }

  log.info('full message', {
    message: await stream.fullMessage(),
  });
});
