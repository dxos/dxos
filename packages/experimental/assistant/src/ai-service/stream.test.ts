//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { log } from '@dxos/log';

import { GenerationStream } from './stream';

log.config({ filter: 'debug' });

describe('GenerationStream', () => {
  it.only('should be able to cancel', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start: (controller) => {
        controller.enqueue(
          encoder.encode(
            'event: message_start\ndata: {"type":"message_start","message":{"id":"123","role":"assistant","content":[]}}\n\n',
          ),
        );
        controller.enqueue(
          encoder.encode(
            'event: content_block_start\ndata: {"type":"content_block_start","content":{"type":"text","text":""}}\n\n',
          ),
        );
        controller.enqueue(
          encoder.encode(
            'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
          ),
        );
        controller.enqueue(encoder.encode('event: content_block_stop\ndata: {"type":"content_block_stop"}\n\n'));
        controller.enqueue(encoder.encode('event: message_stop\ndata: {"type":"message_stop"}\n\n'));
        controller.close();
      },
    });

    const response = new Response(stream);
    const generationStream = GenerationStream.fromSSEResponse({}, response);

    for await (const event of generationStream) {
      log('event', event);
    }

    await generationStream.complete();
  });
});
