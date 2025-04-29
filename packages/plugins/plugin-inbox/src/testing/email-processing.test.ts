import { defineTool, Message } from '@dxos/artifact';
import { AIServiceEdgeClient, MixedStreamParser } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { createStatic } from '@dxos/echo-schema';
import { failedInvariant } from '@dxos/invariant';
import { Schema } from 'effect';
import { describe, test } from 'vitest';
import { contacts, documents, emails, labels } from './test-data';
import { log } from '@dxos/log';
import { processEmail } from './email-processor';

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

describe('Email Processing', () => {
  test('content extraction and labeling', { timeout: 20_000 }, async () => {
    const result = await processEmail({
      email: emails[0],
      aiService,
      context: {
        labels,
        contacts: Object.values(contacts),
        documents,
      },
    });
    log.info('done', { result });
  });
});
