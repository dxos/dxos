//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { type Message } from '@dxos/artifact';
import { log } from '@dxos/log';

import { MixedStreamParser } from './parser';
import { createGenerationStream } from './stream';
import { createTestSSEStream } from '../testing';
import { type GenerationStreamEvent } from '../types';

// TODO(burdon): Tool request/response.

const TEST_BLOCKS = [
  [
    // Text
    'some text',
    'on multiple lines.',

    // XML
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

    '<suggest>Plan me a trip to the Rio.</suggest>',
    '<suggest>Show me steak recipes.</suggest>',
    '<select><option>Yes</option><option>No</option></select>',
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
  test('should generate a stream of blocks', async ({ expect }) => {
    const stream = createGenerationStream(new Response(createTestSSEStream(TEST_BLOCKS)));
    const events: GenerationStreamEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events.map((event) => event.type === 'content_block_start').filter(Boolean)).to.have.length(2);
  });

  for (const splitBy of ['word'] as const) {
    test(`should emit xml blocks (splitBy: ${splitBy})`, async ({ expect }) => {
      const stream = createGenerationStream(new Response(createTestSSEStream(TEST_BLOCKS, { splitBy })));
      const parser = new MixedStreamParser();

      let message: Message | undefined;
      parser.message.on((_message) => {
        message = _message;
      });

      await parser.parse(stream);

      for (const block of message?.content ?? []) {
        log('block', { block });
      }
      expect(message?.content.map((block) => block.type)).to.deep.eq([
        //
        'text',
        'text',
        'text',
        'json',
        'text',
        'json',
        'text',
        'json',
        'text',
        'json',
        'text',
        'json',
        'json',
      ]);
    });
  }

  test.skip('invalid xml', async ({ expect }) => {
    const BLOCKS = [
      //
      '<cot> thoughts <tool-list> more thoughts </cot> <tool-list/>',
    ];

    const stream = createGenerationStream(new Response(createTestSSEStream(BLOCKS, { splitBy: 'word' })));
    const parser = new MixedStreamParser();

    const result = await parser.parse(stream);
    expect(result[0].content).to.deep.eq([
      {
        type: 'text',
        disposition: 'cot',
        text: 'thoughts more thoughts',
      },
      {
        type: 'json',
        disposition: 'tool_list',
        json: '{}',
      },
    ]);
  });
});
