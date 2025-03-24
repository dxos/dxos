//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { test, describe } from 'vitest';

import { defineTool, Message, ToolResult, type Tool } from '@dxos/artifact';
import { toJsonSchema, ObjectId, createStatic } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { DEFAULT_LLM_MODEL } from './defs';
import { AIServiceEdgeClient } from './edge-client';
import { OllamaClient } from './ollama-client';
import { MixedStreamParser } from './parser';
import { ToolTypes } from './types';
import { AI_SERVICE_ENDPOINT } from '../testing';

// log.config({ filter: 'debug' });

describe.skip('AI Service Client', () => {
  test('client generation', async () => {
    const client = new AIServiceEdgeClient({
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

    const stream = await client.exec({
      model: DEFAULT_LLM_MODEL,
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
    const client = new AIServiceEdgeClient({
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

    {
      const stream1 = await client.exec({
        model: DEFAULT_LLM_MODEL,
        spaceId,
        threadId,
        systemPrompt: 'You are a helpful assistant.',
        tools: [custodian],
      });

      for await (const event of stream1) {
        log('event', event);
      }

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
      const stream2 = await client.exec({
        model: DEFAULT_LLM_MODEL,
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
    const client = new AIServiceEdgeClient({
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

    const stream = await client.exec({
      model: DEFAULT_LLM_MODEL,
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

describe.skip('Ollama Client', () => {
  test('basic', async (ctx) => {
    const isRunning = await OllamaClient.isRunning();
    if (!isRunning) {
      ctx.skip();
    }

    const client = OllamaClient.createClient();
    const parser = new MixedStreamParser();

    const messages = await parser.parse(
      await client.exec({
        prompt: createStatic(Message, {
          role: 'user',
          content: [{ type: 'text', text: 'Hello, world!' }],
        }),
      }),
    );

    log.info('messages', { messages });
  });

  test('tool calls', async (ctx) => {
    const isRunning = await OllamaClient.isRunning();
    if (!isRunning) {
      ctx.skip();
    }

    const client = OllamaClient.createClient({
      tools: [
        defineTool('test', {
          name: 'encrypt',
          description: 'Encrypt a message',
          schema: S.Struct({
            message: S.String.annotations({ description: 'The message to encrypt' }),
          }),
          execute: async ({ message }) => ToolResult.Success(message.split('').reverse().join('')),
        }),
      ],
    });
    const parser = new MixedStreamParser();
    parser.streamEvent.on((event) => {
      // log.info('event', { event });
    });

    const messages = await parser.parse(
      await client.exec({
        prompt: createStatic(Message, {
          role: 'user',
          content: [{ type: 'text', text: 'What is the encrypted message for "Hello, world!"' }],
        }),
      }),
    );

    log.info('messages', { messages });
  });

  test('text-to-image', async (ctx) => {
    const isRunning = await OllamaClient.isRunning();
    if (!isRunning) {
      ctx.skip();
    }

    const client = OllamaClient.createClient();
    const parser = new MixedStreamParser();

    const messages = await parser.parse(
      await client.exec({
        prompt: createStatic(Message, {
          role: 'user',
          content: [{ type: 'text', text: 'Generate an image of a cat' }],
        }),
        tools: [
          {
            name: 'text-to-image',
            type: ToolTypes.TextToImage,
          },
        ],
      }),
    );

    log.info('messages', { messages });
  });
});
