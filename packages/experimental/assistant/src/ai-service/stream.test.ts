//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { type Block, StreamingParser } from './parser';
import { GenerationStream } from './stream';
/** @ts-ignore */
import TEXT from './stream.test.txt?raw';

type Part = { event: string; data: any };

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

  it('should parse mixed content.', ({ expect }) => {
    const blocks: Block[] = [];
    const parser = new StreamingParser((block) => {
      blocks.push(block);
    });

    const words = TEXT.split(' ');
    for (const word of words) {
      parser.write(word + ' ');
    }
    parser.end();

    expect(blocks).to.have.length(7);
    expect(blocks.map((block) => block.type)).to.deep.eq(['text', 'tag', 'text', 'tag', 'text', 'code', 'code']);
    expect(blocks.map((block) => block.type === 'tag' && block.name).filter(Boolean)).to.deep.eq(['cot', 'artifact']);
  });
});

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
