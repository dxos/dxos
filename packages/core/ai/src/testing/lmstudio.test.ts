//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { todo } from '@dxos/debug';
import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { createTestLMStudioClient } from './lmstudio';
import { createTool } from '../tools';

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('LM Studio', () => {
  test('basic', async () => {
    const client = createTestLMStudioClient();

    const result = await client.execStream({
      prompt: Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: {
          role: 'user',
        },
        blocks: [{ _tag: 'text', text: 'What is the capital of France?' }],
      }),
    });

    for await (const event of result) {
      console.log(event);
    }
  });

  test.only('tool calls', async () => {
    const client = createTestLMStudioClient();

    const tool = createTool('test', {
      name: 'paint_walls',
      description: 'Paint the walls of a room',
      schema: Schema.Struct({
        color: Schema.String,
      }),
      execute: () => todo(),
    });

    const result = await client.execStream({
      prompt: Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: {
          role: 'user',
        },
        blocks: [{ _tag: 'text', text: 'I want green walls' }],
      }),
      tools: [tool],
    });

    for await (const event of result) {
      console.log(event);
    }
  });
});
