import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { log } from '@dxos/log';
import { describe, test } from 'vitest';
import { processEmail } from './email-processor';
import { contacts, documents, emails, labels } from './test-data';

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

describe.skip('Email Processing', () => {
  test('content extraction and labeling', { timeout: 180_000 }, async () => {
    for (const email of emails) {
      const result = await processEmail({
        email,
        aiService,
        context: {
          labels,
          contacts: Object.values(contacts),
          documents,
        },
      });
      log.info('done', { email, result });
    }
  });
});
