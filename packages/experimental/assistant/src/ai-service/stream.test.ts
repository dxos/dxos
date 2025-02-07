//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { ObjectId } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { MixedStreamParser } from './parser';
import { createGenerationStream } from './stream';
import { type StreamBlock } from './transform';
import { type GenerationStreamEvent } from './types';

type Part = { event: string; data: any };

const TEST_DATA = [
  // JSON
  {},

  [
    // Text
    'some text',
    'on multiple lines.',

    // XML
    '<select>',
    '  <option value="1" />',
    '</select>',

    // JSON
    '<cot>',
    '  1. Analyze content.',
    '  2. Create plan.',
    '  3. Generate artifacts.',
    '</cot>',

    // Text
    'some more text.',

    // XML
    '<artifact id="123" />',

    // XML
    '<artifact id="456" />',

    // Text
    'and some more text.',
  ].join('\n'),

  // JSON
  {
    type: 'input',
    value: {
      level: 1,
      optional: true,
    },
  },
];

describe('GenerationStream', () => {
  it('should generate a stream of blocks', async ({ expect }) => {
    const stream = createGenerationStream(new Response(createTestSSEStream(TEST_DATA)));
    const events: GenerationStreamEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events.map((event) => event.type === 'content_block_start').filter(Boolean)).to.have.length(3);
  });

  it.only('should emit xml blocks', async ({ expect }) => {
    const stream = createGenerationStream(new Response(createTestSSEStream(TEST_DATA)));
    const parser = new MixedStreamParser();
    const blocks: StreamBlock[] = [];
    parser.block.on((block) => {
      blocks.push(block);
    });

    await parser.parse(stream);

    log('blocks', { blocks });
    expect(blocks.map((block) => block.type)).to.deep.eq([
      //
      'json',
      'text',
      'xml',
      'xml',
      'text',
      'xml',
      'xml',
      'text',
      'json',
    ]);
  });
});

/**
 * Mock server-side events (SSE) stream.
 */
export const createTestSSEStream = (blocks: (string | object)[]): ReadableStream => {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start: (controller) => {
      const push = (message: Part) => {
        controller.enqueue(encoder.encode(`event: ${message.event}\ndata: ${JSON.stringify(message.data)}\n\n`));
      };

      push({
        event: 'message_start',
        data: { type: 'message_start', message: { id: ObjectId.random(), role: 'assistant', content: [] } },
      });

      for (const block of blocks) {
        push({
          event: 'content_block_start',
          data: { type: 'content_block_start', content: { type: 'text', text: '' } },
        });

        let index = 0;
        if (typeof block === 'string') {
          for (const word of block.split(/[ \t]+/)) {
            push({
              event: 'content_block_delta',
              data: { type: 'content_block_delta', index, delta: { type: 'text_delta', text: word + ' ' } },
            });
            index += word.length + 1;
          }
        } else {
          const text = JSON.stringify(block, null, 2);
          for (const line of text.split('\n')) {
            push({
              event: 'content_block_delta',
              data: { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: line } },
            });
            index += line.length + 1;
          }
        }

        push({
          event: 'content_block_stop',
          data: { type: 'content_block_stop' },
        });
      }

      push({
        event: 'message_stop',
        data: { type: 'message_stop' },
      });

      controller.close();
    },
  });
};
