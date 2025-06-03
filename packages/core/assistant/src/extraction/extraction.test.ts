//
// Copyright 2025 DXOS.org
//

import { describe, test, expect } from 'vitest';

import { AIServiceEdgeClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { log } from '@dxos/log';
import { createTestData } from '@dxos/schema/testing';
import { range } from '@dxos/util';

import { processTranscriptMessage, postprocessText } from './extraction';

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

describe.skip('EntityExtraction', { timeout: 180_000 }, () => {
  test.skip('should process a transcript block', async () => {
    const { transcriptMessages, documents, contacts } = await createTestData();

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

  test.only('computational irreducibility', async () => {
    const { transcriptWoflram, documents, contacts } = await createTestData();

    log.info('context', { documents, contacts });
    const message = transcriptWoflram[0];
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

  test('org and document linking', async () => {
    const { transcriptJosiah, documents, contacts, organizations } = await createTestData();

    log.info('context', { contacts, organizations, documents });

    for (const message of transcriptJosiah) {
      log.info('input', message);

      const { message: enhancedMessage } = await processTranscriptMessage({
        message,
        aiService,
        context: {
          objects: [...documents, ...Object.values(contacts), ...Object.values(organizations)],
        },
      });
      log.info('output', enhancedMessage);
    }
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
