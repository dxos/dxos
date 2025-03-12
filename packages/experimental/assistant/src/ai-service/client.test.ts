//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { test, describe } from 'vitest';

import { Message, type Tool } from '@dxos/artifact';
import { toJsonSchema, ObjectId, createStatic } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { AIServiceClientImpl } from './client';
import { DEFAULT_LLM_MODEL } from './defs';
import { ToolTypes } from './types';
import { AI_SERVICE_ENDPOINT } from '../testing';

// log.config({ filter: 'debug' });

const MODEL = '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b';
// const MODEL = '@hf/nousresearch/hermes-2-pro-mistral-7b';
// const MODEL = DEFAULT_LLM_MODEL;

describe('AI Service Client', () => {
  test('client generation', async () => {
    const client = new AIServiceClientImpl({
      endpoint: AI_SERVICE_ENDPOINT.LOCAL,
    });

    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    const stream = await client.exec({
      model: MODEL,
      spaceId,
      threadId,
      systemPrompt: 'You are a poet',
      tools: [],
      history: [
        createStatic(Message, {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        }),
      ],
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

    {
      const stream1 = await client.exec({
        model: MODEL,
        systemPrompt: 'You are a helpful assistant.',
        history: [
          createStatic(Message, {
            role: 'user',
            content: [{ type: 'text', text: 'Call the custodian tool' }],
            // content: [{ type: 'text', text: 'What tools do you have?' }],
          }),
        ],
        tools: [custodian],
      });

      for await (const event of stream1) {
        log.info('event', event);
      }

      // TODO(burdon): !!!
      await stream1.complete();
      // const messages: Message[] = [];

      // const [message1] = messages;
      // log('full message', { message: message1 });
      // await client.appendMessages([message1]);

      // const toolUse = message1.content.find(({ type }) => type === 'tool_use')!;
      // invariant(toolUse.type === 'tool_use');
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

    // {
    //   const stream2 = await client.exec({
    //     model: DEFAULT_LLM_MODEL,
    //     spaceId,
    //     threadId,
    //     systemPrompt: 'You are a helpful assistant.',
    //     tools: [custodian],
    //   });

    //   for await (const event of stream2) {
    //     log('event', event);
    //   }

    //   await stream2.complete();
    //   const messages: Message[] = [];

    //   const [message2] = messages;
    //   log('full message', { message: message2 });
    // }
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
