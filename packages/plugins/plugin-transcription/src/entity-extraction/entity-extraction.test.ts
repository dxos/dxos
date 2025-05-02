import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { log } from '@dxos/log';
import { describe, test } from 'vitest';
import * as TestData from '../testing/test-data';
import { processTranscriptBlock } from './entity-extraction';

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

describe.skip('EntityExtraction', { timeout: 180_000 }, () => {
  test('should process a transcript block', async () => {
    for (const block of TestData.transcriptBlocks) {
      log.info('input', block);
      const { block: enhancedBlock } = await processTranscriptBlock({
        block,
        aiService,
        context: {
          objects: [...TestData.documents, ...Object.values(TestData.contacts)],
        },
      });
      log.info('output', enhancedBlock);
    }
  });
});
