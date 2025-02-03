//
// Copyright 2025 DXOS.org
//

import { Parser } from 'htmlparser2';
import { micromark } from 'micromark';
import { Readable, Transform } from 'stream';
import { describe, it } from 'vitest';

/** @ts-ignore */
import TEXT from './data/simple-mixed.txt?raw';
import { GenerationStream } from './stream';

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

  type Block = {
    type: 'xml' | 'text';
    tag?: string;
    attributes?: Record<string, string>;
    content: string;
  };

  it.only('should parse Markdown.', ({ expect }) => {
    const stream = new MarkdownStream();
    stream.on('data', (html) => {
      console.log(html);
    });

    Readable.from(TEXT).pipe(stream);
  });

  it.only('should parse XML and text.', ({ expect }) => {
    const blocks: Block[] = [];
    let current: Block | undefined;
    const parser = new Parser(
      {
        onopentag: (tag, attributes) => {
          if (current) {
            blocks.push(current);
          }

          current = { type: 'xml', tag, attributes, content: '' };
        },
        ontext: (text) => {
          if (!current) {
            current = { type: 'text', content: text };
          } else if (current?.type === 'text') {
            current.content += text;
          } else {
            current.content = (current.content || '') + text.trim();
          }
        },
        onclosetag: (tag) => {
          if (current?.tag === tag) {
            blocks.push(current as Block);
            current = undefined;
          }
        },
        onend: () => {
          if (current) {
            blocks.push(current);
          }
        },
      },
      {
        xmlMode: true,
        decodeEntities: true,
        recognizeSelfClosing: true,
      },
    );

    const words = TEXT.split(' ');
    for (const word of words) {
      parser.write(word + ' ');
    }
    parser.end();

    expect(blocks).to.have.length(5);
    expect(blocks.map((block) => block.type)).to.deep.eq(['text', 'xml', 'text', 'xml', 'text']);
    expect(blocks.map((block) => block.type === 'xml' && block.tag).filter(Boolean)).to.deep.eq(['cot', 'artifact']);
  });
});

class MarkdownStream extends Transform {
  private buffer = '';

  constructor() {
    super({ objectMode: true });
  }

  override _transform(chunk: Buffer, _: BufferEncoding, callback: Function) {
    // Accumulate chunk
    this.buffer += chunk.toString();

    // Find complete blocks (double newlines)
    const blocks = this.buffer.split('\n\n');

    // Keep last potentially incomplete block
    this.buffer = blocks.pop() || '';

    // Process complete blocks
    blocks.forEach((block) => {
      if (block.trim()) {
        try {
          this.push(micromark(block));
        } catch (e) {
          // Fallback for malformed markdown
          this.push(`<p>${block}</p>`);
        }
      }
    });

    callback();
  }

  override _flush(callback: Function) {
    if (this.buffer.trim()) {
      try {
        this.push(micromark(this.buffer));
      } catch (e) {
        this.push(`<p>${this.buffer}</p>`);
      }
    }
    callback();
  }
}
