//
// Copyright 2025 DXOS.org
//

import { Parser } from 'htmlparser2';
import { describe, it } from 'vitest';

import { ObjectId } from '@dxos/echo-schema';

import { GenerationStream } from './stream';
import { type MessageContentBlock, type Message } from './types';

type Part = { event: string; data: any };

export const createTestStream = (blocks: string[]): ReadableStream => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start: (controller) => {
      const push = (message: Part) => {
        controller.enqueue(encoder.encode(`event: ${message.event}\ndata: ${JSON.stringify(message.data)}\n\n`));
      };

      push({
        event: 'message_start',
        data: { type: 'message_start', message: { id: '123', role: 'assistant', content: [] } },
      });

      for (const block of blocks) {
        push({
          event: 'content_block_start',
          data: { type: 'content_block_start', content: { type: 'text', text: '' } },
        });

        let index = 0;
        for (const word of block.split(' ')) {
          push({
            event: 'content_block_delta',
            data: { type: 'content_block_delta', index, delta: { type: 'text_delta', text: word + ' ' } },
          });

          index += word.length + 1;
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

describe('GenerationStream', () => {
  it('should stream messages', async ({ expect }) => {
    const input = [['<cot>', '1. Ready.', '2. Aim.', '3. Fire.', '</cot>'].join('\n'), 'Hello world!'];
    const output = [];

    let block: string[] = [];
    const stream = GenerationStream.fromSSEResponse({}, new Response(createTestStream(input)));
    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_start': {
          block = [(event.content as any).text];
          break;
        }
        case 'content_block_delta': {
          block.push((event.delta as any).text);
          break;
        }
        case 'content_block_stop': {
          output.push(block.join('').trim());
          break;
        }
      }
    }

    expect(output.length).to.equal(input.length);
    expect(output).to.deep.equal(input);
    await stream.complete();
  });

  /**
   * https://astexplorer.net
   */
  it('should parse the stream', async ({ expect }) => {
    const input = [
      ['<cot>1. Prepare the ship.', '2. Arm the torpedoes.', '3. Fire lasers.', '</cot>'].join('\n'),
      'Hello world!',
    ];

    const output: Message = { id: ObjectId.random(), role: 'assistant', content: [] };
    let block: MessageContentBlock | undefined;
    let text: string[] = [];
    const parser = new Parser({
      onopentag: () => {
        text = [];
      },

      onclosetag: (name) => {
        switch (name) {
          case 'cot': {
            block = { type: 'cot', text: text.join(' ') };
            break;
          }
        }
        if (block) {
          output.content.push(block);
          block = undefined;
        }
        text = [];
      },

      ontext: (str) => {
        if (!block) {
          block = { type: 'text', text: '' };
        }
        if (str.trim()) {
          text.push(str.trim());
        }
      },

      onend: () => {
        if (block) {
          if (block.type === 'text') {
            block.text = text.join(' ');
          }
          output.content.push(block);
        }
      },
    });

    const stream = GenerationStream.fromSSEResponse({}, new Response(createTestStream(input)));
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        parser.write((event.delta as any).text);
      }
    }
    parser.end();

    expect(output.content).to.deep.equal([
      {
        type: 'cot',
        text: '1. Prepare the ship.\n2. Arm the torpedoes.\n3. Fire lasers.',
      },
      {
        type: 'text',
        text: 'Hello world!',
      },
    ]);

    await stream.complete();
  });
});
