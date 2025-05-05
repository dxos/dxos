//
// Copyright 2025 DXOS.org
//

import { describe, test, expect } from 'vitest';

import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { log } from '@dxos/log';

import { processTranscriptMessage, postprocessText } from './entity-extraction';
import * as TestData from '../testing/test-data';
import { range } from '@dxos/util';

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

describe.skip('EntityExtraction', { timeout: 180_000 }, () => {
  test('should process a transcript block', async () => {
    const { transcriptMessages, documents, contacts } = await TestData.createTestData();

    log.info('context', { documents, contacts });

    for (const message of transcriptMessages) {
      log.info('input', message);
      const { message: enhancedMessage } = await processTranscriptMessage({
        message,
        aiService,
        context: {
          objects: [...documents, ...Object.values(contacts)],
        },
      });
      log.info('output', enhancedMessage);
    }
  });

  test.skip('computational irreducibility', async () => {
    const { transcriptMessages, documents, contacts } = await TestData.createTestData();

    log.info('context', { documents, contacts });
    const message = transcriptMessages[0];
    log.info('input', message);

    await Promise.all(
      range(10).map(async () => {
        const { message: enhancedMessage, timeElapsed } = await processTranscriptMessage({
          message,
          aiService,
          context: {
            objects: [...documents, ...Object.values(contacts)],
          },
        });
        log.info('output', { message: enhancedMessage.blocks[0], timeElapsed });
      }),
    );
  });
});

describe('postprocessText', () => {
  test('should replace quotes with DXN references', () => {
    const quotes = {
      references: [{ quote: 'computational irreducibility', id: '01JTG9JW11XGWJZ32AW8ET93D1' }],
    };

    expect(postprocessText('This is a computational irreducibility test.', quotes)).toBe(
      'This is a [computational irreducibility][dxn:echo:@:01JTG9JW11XGWJZ32AW8ET93D1] test.',
    );
    expect(
      postprocessText(
        "And what I'd like to talk today about is Steven Wolfram's concept of a computational irreducibility.",
        quotes,
      ),
    ).toBe(
      "And what I'd like to talk today about is Steven Wolfram's concept of a [computational irreducibility][dxn:echo:@:01JTG9JW11XGWJZ32AW8ET93D1].",
    );
  });
});
