//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { EdgeAiServiceClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { log } from '@dxos/log';
import { createTestData } from '@dxos/schema/testing';

import { processEmail } from './email-processor';

const aiClient = new EdgeAiServiceClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

describe.skip('Email Processing', () => {
  test('content extraction and labeling', { timeout: 180_000 }, async () => {
    const { contacts, documents, emails, labels } = await createTestData();
    for (const email of emails) {
      const result = await processEmail({
        email,
        aiClient,
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
