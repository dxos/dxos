//
// Copyright 2025 DXOS.org
//

import { beforeAll, describe, test } from 'vitest';

import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { log } from '@dxos/log';
import { Testing } from '@dxos/schema/testing';
import { type Message, Organization, Person } from '@dxos/types';
import { createTestData } from '@dxos/types/testing';
import { range } from '@dxos/util';

import { processTranscriptMessage } from '../extraction';

import { extractionNerFunction } from './extraction-ner-function';

describe.skip('NER EntityExtraction', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let executor: FunctionExecutor;
  let testData: {
    transcriptJosiah: Message.Message[];
    transcriptWoflram: Message.Message[];
    transcriptMessages: Message.Message[];
    documents: Testing.DocumentType[];
    contacts: Record<string, Person.Person>;
    organizations: Record<string, Organization.Organization>;
  };

  const TYPES = [Organization.Organization, Person.Person, Testing.Contact, Testing.DocumentType];

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
        function: extractionNerFunction,
        executor,
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
          function: extractionNerFunction,
          executor,
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
        function: extractionNerFunction,
        executor,
      });
      log.info('output', enhancedMessage);
    }
  });
});
