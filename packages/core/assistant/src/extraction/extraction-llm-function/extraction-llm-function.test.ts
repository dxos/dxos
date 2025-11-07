//
// Copyright 2025 DXOS.org
//

import { beforeAll, describe, test } from 'vitest';

import { todo } from '@dxos/debug';
import { FunctionExecutor } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { createTestData } from '@dxos/schema/testing';
import { range } from '@dxos/util';

import { processTranscriptMessage } from '../extraction';

import { extractionAnthropicFunction } from './extraction-llm-function';

// TODO(burdon): Rewrite test.
describe.skip('LLM EntityExtraction', () => {
  let executor: FunctionExecutor;

  beforeAll(async () => {
    executor = new FunctionExecutor(todo());
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
        function: extractionAnthropicFunction,
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
          function: extractionAnthropicFunction,
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
        function: extractionAnthropicFunction,
        executor,
      });

      log.info('output', enhancedMessage);
    }
  });
});
