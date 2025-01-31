//
// Copyright 2025 DXOS.org
//

import { SaxesParser } from 'saxes';
import { describe, it } from 'vitest';

import { ObjectId } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { GenerationStream } from './stream';
import { type Message } from './types';

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
      // Text
      `
      Hello world!
      `,

      // COT
      `
      <cot>
      1. Prepare the ship.
      2. Arm the torpedoes.
      3. Fire lasers.
      </cot>
      `,

      // Artifact
      // <?xml version="1.0" encoding="UTF-8"?>
      `
      <artifact id="123" />
      <choice id="123">
        <artifact id="123" />
      </choice>
      `,

      // JSON
      `
      <json>
      <![CDATA[
      {
        "type": "text",
        "text": "<test>OK</test>"
      }
      ]]>
      </json>
      `,

      // Code/JSX
      `,
      <code>
      <![CDATA[
      const Test = () => {
        return <div>Hello world!</div>;
      }
      ]]>
      </code>
      `,
    ];

    // TODO(burdon): Delimiter for JSON blocks.

    const output: Message = { id: ObjectId.random(), role: 'assistant', content: [] };

    /**
     * https://www.npmjs.com/package/saxex
     */
    const parser = new SaxesParser({
      fragment: true,
    });

    parser.on('error', (error) => {
      log.error('error', { error });
    });
    parser.on('opentag', (node) => {
      log.info('opentag', { node });
    });
    parser.on('closetag', (node) => {
      log.info('closetag', { node });
    });
    parser.on('cdata', (text) => {
      log.info('cdata', { text });
    });
    parser.on('text', (text) => {
      log.info('text', { text });
    });
    parser.on('end', () => {
      log.info('end');
    });

    const stream = GenerationStream.fromSSEResponse({}, new Response(createTestStream(input)));
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        // log.info('delta', { delta: (event.delta as any).text });
        parser.write((event.delta as any).text);
      }
    }

    await stream.complete();

    expect(output.content).to.deep.equal([]);
  });
});
