//
// Copyright 2025 DXOS.org
//

import { describe, test, expect, beforeAll } from 'vitest';

import { AIServiceEdgeClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { log } from '@dxos/log';
import { createTestData } from '@dxos/schema/testing';
import { range } from '@dxos/util';

import { processTranscriptMessage } from '../extraction';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { EchoDatabase } from '@dxos/echo-db';
import { DataType } from '@dxos/schema';
import { Testing } from '@dxos/schema/testing';

import { extractionNerFn } from './extraction-ner-function';

describe('NER EntityExtraction', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let executor: FunctionExecutor;
  let testData: {
    transcriptJosiah: DataType.Message[];
    transcriptWoflram: DataType.Message[];
    transcriptMessages: DataType.Message[];
    documents: Testing.DocumentType[];
    contacts: Record<string, DataType.Person>;
    organizations: Record<string, DataType.Organization>;
  };
  const TYPES = [DataType.Organization, DataType.Person, Testing.Contact, Testing.DocumentType];

  beforeAll(async () => {
    // TODO(dmaretskyi): Helper to scaffold this from a config.
    builder = await new EchoTestBuilder().open();
    const { db: db1 } = await builder.createDatabase({ indexing: { vector: true } });
    db = db1;
    db.graph.schemaRegistry.addSchema(TYPES);
    const data = createTestData();
    testData = {
      transcriptJosiah: data.transcriptJosiah,
      transcriptWoflram: data.transcriptWoflram,
      transcriptMessages: data.transcriptMessages,
      documents: data.documents.map((document) => db.add(document)),
      contacts: Object.fromEntries(Object.entries(data.contacts).map(([key, value]) => [key, db.add(value)])),
      organizations: Object.fromEntries(Object.entries(data.organizations).map(([key, value]) => [key, db.add(value)])),
    };
    await db.flush();

    executor = new FunctionExecutor(
      new ServiceContainer().setServices({
        database: { db },
      }),
    );
  }, 30_000);

  test('should process a transcript block', async () => {
    const { transcriptMessages, documents, contacts } = testData;
    log.info('context', { documents, contacts });

    for (const message of transcriptMessages) {
      log.info('input', message);
      const { message: enhancedMessage } = await processTranscriptMessage({
        input: {
          message,
          objects: [...documents, ...Object.values(contacts)],
        },
        function: extractionNerFn,
        executor: executor,
      });
      log.info('output', enhancedMessage);
    }
  });

  test('computational irreducibility', async () => {
    const { transcriptWoflram, documents, contacts } = testData;

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
          function: extractionNerFn,
          executor: executor,
        });
        log.info('output', { message: enhancedMessage.blocks[0], timeElapsed });
      }),
    );
  });

  test('org and document linking', async () => {
    const { transcriptJosiah, documents, contacts, organizations } = testData;

    log.info('context', { contacts, organizations, documents });

    for (const message of transcriptJosiah) {
      log.info('input', message);

      const { message: enhancedMessage } = await processTranscriptMessage({
        input: {
          message,
          objects: [...documents, ...Object.values(contacts), ...Object.values(organizations)],
        },
        function: extractionNerFn,
        executor: executor,
      });
      log.info('output', enhancedMessage);
    }
  });
});
