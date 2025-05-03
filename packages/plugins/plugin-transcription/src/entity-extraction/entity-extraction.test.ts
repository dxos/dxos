//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { log } from '@dxos/log';

import { processTranscriptMessage } from './entity-extraction';
import * as TestData from '../testing/test-data';

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

describe.skip('EntityExtraction', { timeout: 180_000 }, () => {
  test('should process a transcript block', async () => {
    for (const message of TestData.transcriptMessages) {
      log.info('input', message);
      const { message: enhancedMessage } = await processTranscriptMessage({
        message,
        aiService,
        context: {
          objects: [...TestData.documents, ...Object.values(TestData.contacts)],
        },
      });
      log.info('output', enhancedMessage);
    }
  });
});
