//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';
import { createTestData } from '@dxos/types/testing';

import { processEmail } from './email-processor';

describe.skip('Email Processing', () => {
  test('content extraction and labeling', { timeout: 180_000 }, async () => {
    const { contacts, documents, emails, labels } = await createTestData();
    for (const email of emails) {
      const result = await processEmail({
        email,
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
