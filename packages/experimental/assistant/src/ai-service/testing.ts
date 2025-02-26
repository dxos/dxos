//
// Copyright 2025 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';

import { type GenerationStreamEvent } from './types';

/**
 * Mock server-side events (SSE) stream.
 */
export const createTestSSEStream = (
  pars: (string | object)[],
  { splitBy = 'word' }: { splitBy?: 'word' | 'character' } = {},
): ReadableStream => {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start: (controller) => {
      const push = (event: GenerationStreamEvent) => {
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
      };

      push({
        type: 'message_start',
        message: {
          id: ObjectId.random(),
          role: 'assistant',
          content: [],
        },
      });

      for (const block of pars) {
        let index = 0;
        if (typeof block === 'string') {
          push({
            type: 'content_block_start',
            index,
            content: {
              type: 'text',
              text: '',
            },
          });

          for (const word of block.split(splitBy === 'word' ? /([ \t\n]+)/ : '')) {
            push({
              type: 'content_block_delta',
              index,
              delta: {
                type: 'text_delta',
                text: word,
              },
            });
            index += word.length + 1;
          }
        } else {
          push({
            type: 'content_block_start',
            index,
            content: {
              type: 'json',
              json: '',
            },
          });

          const text = JSON.stringify(block, null, 2);
          for (const line of text.split('\n')) {
            push({
              type: 'content_block_delta',
              index,
              delta: {
                type: 'input_json_delta',
                partial_json: line,
              },
            });
            index += line.length + 1;
          }
        }

        push({
          type: 'content_block_stop',
          index,
        });
      }

      push({
        type: 'message_stop',
      });

      controller.close();
    },
  });
};
