//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { test, describe } from 'vitest';

import { Obj } from '@dxos/echo';
import { toJsonSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { DEFAULT_EDGE_MODEL } from './defs';
import { EdgeAiServiceClient, MixedStreamParser, OllamaAiServiceClient } from './service';
import { AI_SERVICE_ENDPOINT, createTestAiServiceClient } from './testing';
import { createTool, defineTool, Message, ToolResult } from './tools';
import { ToolTypes } from './types';

// log.config({ filter: 'debug' });

describe.skip('AI Service Client', () => {
  test('client generation', async () => {
    const aiClient = new EdgeAiServiceClient({
      endpoint: AI_SERVICE_ENDPOINT.LOCAL,
    });

    // await client.appendMessages([
    //   {
    //     id: ObjectId.random(),
    //     spaceId,
    //     threadId,
    //     role: 'user',
    //     content: [{ type: 'text', text: 'Hello' }],
    //   },
    // ]);

    const stream = await aiClient.execStream({
      model: DEFAULT_EDGE_MODEL,
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
    const aiClient = new EdgeAiServiceClient({
      endpoint: AI_SERVICE_ENDPOINT.LOCAL,
    });

    const custodian = defineTool('testing', {
      name: 'custodian',
      description: 'Custodian can tell you the password if you say the magic word',
      parameters: toJsonSchema(
        Schema.Struct({
          magicWord: Schema.String.annotations({ description: 'The magic word. Should be exactly "pretty please"' }),
        }),
      ),
    });

    // await client.appendMessages([
    //   {
    //     id: ObjectId.random(),
    //     spaceId,
    //     threadId,
    //     role: 'user',
    //     content: [{ type: 'text', text: 'What is the password? Ask the custodian' }],
    //   },
    // ]);

    {
      const stream1 = await aiClient.execStream({
        model: DEFAULT_EDGE_MODEL,
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
      // await client.appendMessages([message1]);

      const toolUse = message1.content.find(({ type }) => type === 'tool_use')!;
      invariant(toolUse.type === 'tool_use');
      // await client.appendMessages([
      //   {
      //     id: ObjectId.random(),
      //     spaceId,
      //     threadId,
      //     role: 'user',
      //     content: [{ type: 'tool_result', toolUseId: toolUse.id, content: 'password="The sky is blue"' }],
      //   },
      // ]);
    }

    {
      const stream2 = await aiClient.execStream({
        model: DEFAULT_EDGE_MODEL,
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
    const aiClient = new EdgeAiServiceClient({
      endpoint: AI_SERVICE_ENDPOINT.LOCAL,
    });

    // await client.appendMessages([
    //   {
    //     id: ObjectId.random(),
    //     spaceId,
    //     threadId,
    //     role: 'user',
    //     content: [{ type: 'text', text: 'Generate an image of a cat' }],
    //   },
    // ]);

    const stream = await aiClient.execStream({
      model: DEFAULT_EDGE_MODEL,
      tools: [
        defineTool('testing', {
          name: 'text-to-image',
          type: ToolTypes.TextToImage,
          // options: {
          //   model: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
          // },
        }),
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
    const isRunning = await OllamaAiServiceClient.isRunning();
    if (!isRunning) {
      ctx.skip();
    }

    const client = createTestAiServiceClient();
    const parser = new MixedStreamParser();

    const messages = await parser.parse(
      await client.execStream({
        prompt: Obj.make(Message, {
          role: 'user',
          content: [{ type: 'text', text: 'Hello, world!' }],
        }),
      }),
    );

    log('messages', { messages });
  });

  test('tool calls', async (ctx) => {
    const isRunning = await OllamaAiServiceClient.isRunning();
    if (!isRunning) {
      ctx.skip();
    }

    const aiClient = createTestAiServiceClient({
      tools: [
        createTool('test', {
          name: 'encrypt',
          description: 'Encrypt a message',
          schema: Schema.Struct({
            message: Schema.String.annotations({ description: 'The message to encrypt' }),
          }),
          execute: async ({ message }) => ToolResult.Success(message.split('').reverse().join('')),
        }),
      ],
    });
    const parser = new MixedStreamParser();
    parser.streamEvent.on((event) => {
      // log('event', { event });
    });

    const messages = await parser.parse(
      await aiClient.execStream({
        prompt: Obj.make(Message, {
          role: 'user',
          content: [{ type: 'text', text: 'What is the encrypted message for "Hello, world!"' }],
        }),
      }),
    );

    log('messages', { messages });
  });

  test('text-to-image', async (ctx) => {
    const isRunning = await OllamaAiServiceClient.isRunning();
    if (!isRunning) {
      ctx.skip();
    }

    const client = createTestAiServiceClient();
    const parser = new MixedStreamParser();

    const messages = await parser.parse(
      await client.execStream({
        prompt: Obj.make(Message, {
          role: 'user',
          content: [{ type: 'text', text: 'Generate an image of a cat' }],
        }),
        tools: [
          defineTool('testing', {
            name: 'text-to-image',
            type: ToolTypes.TextToImage,
          }),
        ],
      }),
    );

    log('messages', { messages });
  });
});
