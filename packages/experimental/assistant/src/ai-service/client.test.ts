//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { test, describe } from 'vitest';

import { type Message, type Tool } from '@dxos/artifact';
import { toJsonSchema, ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { AIServiceClientImpl } from './client';
import { ToolTypes } from './types';
import { AI_SERVICE_ENDPOINT } from '../testing';

// log.config({ filter: 'debug' });

describe.skip('AI Service Client', () => {
  test('client generation', async () => {
    const client = new AIServiceClientImpl({
      endpoint: AI_SERVICE_ENDPOINT.LOCAL,
    });

    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    await client.appendMessages([
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
      log('event', event);
    }

    log('full message', {
      message: await stream.complete(),
    });
  });

  test('tool calls', async () => {
    const client = new AIServiceClientImpl({
      endpoint: AI_SERVICE_ENDPOINT.LOCAL,
    });

    const custodian: Tool = {
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

    await client.appendMessages([
      {
        id: ObjectId.random(),
        spaceId,
        threadId,
        role: 'user',
        content: [{ type: 'text', text: 'What is the password? Ask the custodian' }],
      },
    ]);

    const stream1 = await client.generate({
      model: '@anthropic/claude-3-5-haiku-20241022',
      spaceId,
      threadId,
      systemPrompt: 'You are a helpful assistant.',
      tools: [custodian],
    });

    for await (const event of stream1) {
      log('event', event);
    }

    {
      // TODO(burdon): !!!
      await stream1.complete();
      const messages: Message[] = [];

      const [message1] = messages;
      log('full message', { message: message1 });
      await client.appendMessages([message1]);

      const toolUse = message1.content.find(({ type }) => type === 'tool_use')!;
      invariant(toolUse.type === 'tool_use');
      await client.appendMessages([
        {
          id: ObjectId.random(),
          spaceId,
          threadId,
          role: 'user',
          content: [{ type: 'tool_result', toolUseId: toolUse.id, content: 'password="The sky is blue"' }],
        },
      ]);
    }

    {
      const stream2 = await client.generate({
        model: '@anthropic/claude-3-5-haiku-20241022',
        spaceId,
        threadId,
        systemPrompt: 'You are a helpful assistant.',
        tools: [custodian],
      });

      for await (const event of stream2) {
        log('event', event);
      }

      await stream2.complete();
      const messages: Message[] = [];

      const [message2] = messages;
      log('full message', { message: message2 });
    }
  });

  test.skip('image generation', async () => {
    const client = new AIServiceClientImpl({
      endpoint: AI_SERVICE_ENDPOINT.LOCAL,
    });

    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    await client.appendMessages([
      {
        id: ObjectId.random(),
        spaceId,
        threadId,
        role: 'user',
        content: [{ type: 'text', text: 'Generate an image of a cat' }],
      },
    ]);

    const stream = await client.generate({
      model: '@anthropic/claude-3-5-sonnet-20241022',
      spaceId,
      threadId,
      tools: [
        {
          name: 'text-to-image',
          type: ToolTypes.TextToImage,
          // options: {
          //   model: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
          // },
        },
      ],
    });

    for await (const event of stream) {
      log('event', event);
    }

    log('full message', { message: await stream.complete() });
  });
});
