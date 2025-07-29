//
// Copyright 2025 DXOS.org
//

import { describe, test, beforeAll } from 'vitest';

import { EdgeAiServiceClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { log } from '@dxos/log';
import { createTestData } from '@dxos/schema/testing';
import { range } from '@dxos/util';

import { extractionAnthropicFn } from './extraction-llm-function';
import { processTranscriptMessage } from '../extraction';

describe.skip('LLM EntityExtraction', () => {
  let executor: FunctionExecutor;

  beforeAll(async () => {
    executor = new FunctionExecutor(
      new ServiceContainer().setServices({
        ai: {
          client: new EdgeAiServiceClient({
            endpoint: AI_SERVICE_ENDPOINT.REMOTE,
            defaultGenerationOptions: {
              // model: '@anthropic/claude-sonnet-4-20250514',
              model: '@anthropic/claude-3-5-haiku-20241022',
            },
          }),
        } as any, // TODO(burdon): Rewrite test.
      }),
    );
  });

  test('should process a transcript block', async () => {
    const { transcriptMessages, documents, contacts } = createTestData();
    log.info('context', { documents, contacts });

    for (const message of transcriptMessages.slice(0, 1)) {
      log.info('input', message);
      const { message: enhancedMessage } = await processTranscriptMessage({
        input: {
          message,
          objects: [...documents, ...Object.values(contacts)],
        },
        function: extractionAnthropicFn,
        executor,
      });
      log.info('output', enhancedMessage);
    }
  });

  test('computational irreducibility', async () => {
    const { transcriptWoflram, documents, contacts } = createTestData();

    log.info('context', { documents, contacts });
    const message = transcriptWoflram[0];
    log.info('input', message);

    await Promise.all(
      range(10).map(async () => {
        const { message: enhancedMessage, timeElapsed } = await processTranscriptMessage({
          input: {
            message,
            objects: [...documents, ...Object.values(contacts)],
          },
          function: extractionAnthropicFn,
          executor,
        });
        log.info('output', { message: enhancedMessage.blocks[0], timeElapsed });
      }),
    );
  });

  test('org and document linking', async () => {
    const { transcriptJosiah, documents, contacts, organizations } = createTestData();

    log.info('context', { contacts, organizations, documents });

    for (const message of transcriptJosiah) {
      log.info('input', message);

      const { message: enhancedMessage } = await processTranscriptMessage({
        input: {
          message,
          objects: [...documents, ...Object.values(contacts), ...Object.values(organizations)],
        },
        function: extractionAnthropicFn,
        executor,
      });
      log.info('output', enhancedMessage);
    }
  });
});
