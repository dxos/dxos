//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { type Message } from '@dxos/artifact';
import { log } from '@dxos/log';

import { MixedStreamParser } from './parser';
import { createGenerationStream } from './stream';
import { createTestSSEStream } from './testing';
import { type GenerationStreamEvent } from './types';

const TEST_BLOCKS = [
  [
    // Text
    'some text',
    'on multiple lines.',

    // XML
    '<select>',
    '  <option value="1" />',
    '</select>',

    // 'Hello',

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
    const stream = createGenerationStream(new Response(createTestSSEStream(TEST_BLOCKS)));
    const events: GenerationStreamEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events.map((event) => event.type === 'content_block_start').filter(Boolean)).to.have.length(2);
  });

  for (const splitBy of ['word'] as const) {
    it(`should emit xml blocks (splitBy: ${splitBy})`, async ({ expect }) => {
      const stream = createGenerationStream(new Response(createTestSSEStream(TEST_BLOCKS, { splitBy })));
      const parser = new MixedStreamParser();

      let message: Message | undefined;
      parser.message.on((_message) => {
        message = _message;
      });

      await parser.parse(stream);

      log('blocks', { message });
      expect(message?.content.map((block) => block.type)).to.deep.eq([
        //
        'text',
        'text',
        'text',
        'text',
        'json',
        'text',
        'json',
        'text',
        'json',
      ]);
    });
  }
});
