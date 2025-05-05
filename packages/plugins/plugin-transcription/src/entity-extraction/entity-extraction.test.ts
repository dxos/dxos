//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { log } from '@dxos/log';
import { createTestData } from '@dxos/schema/testing';

import { processTranscriptMessage } from './entity-extraction';

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

describe.skip('EntityExtraction', { timeout: 180_000 }, () => {
  test('should process a transcript block', async () => {
    const { transcriptMessages, documents, contacts } = await createTestData();
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
});
