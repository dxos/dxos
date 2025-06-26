//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { DEFAULT_EDGE_MODEL, EdgeAiServiceClient } from '@dxos/ai';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { ObjectId } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { createCypherTool, createSystemPrompt } from './prompts';
import { createTestData, seedTestData } from './test-data';
import { Contact, Organization, Project, Task } from './test-schema';
import { runLLM } from '../conversation';
import { EchoDataSource } from '../cypher';
import { AI_SERVICE_ENDPOINT } from '../testing';
import { createUserMessage } from '../tools';
import { createLogger } from '../util';

const aiClient = new EdgeAiServiceClient({
  endpoint: AI_SERVICE_ENDPOINT.LOCAL,
});

test.skip('cypher query', async () => {
  const dataSource = createTestData();
  const schemaTypes = [Organization, Project, Task, Contact];

  const cypherTool = createCypherTool(dataSource);

  const spaceId = SpaceId.random();
  const threadId = ObjectId.random();

  const result = await runLLM({
    aiClient,
    model: DEFAULT_EDGE_MODEL,
    tools: [cypherTool],
    spaceId,
    threadId,
    system: createSystemPrompt(schemaTypes),
    history: [
      createUserMessage(
        spaceId,
        threadId,
        'Query the database and give me all employees from DXOS organization that work on Composer and what their tasks are.',
      ),
    ],
    logger: createLogger({ stream: false }),
  });

  log('DONE', { result: result.result });
});

test.skip('query ECHO', async () => {
  await using builder = await new EchoTestBuilder().open();
  const { db, graph } = await builder.createDatabase();

  const schemaTypes = [Organization, Project, Task, Contact];
  graph.schemaRegistry.addSchema(schemaTypes);

  seedTestData(db);
  await db.flush({ indexes: true });

  const dataSource = new EchoDataSource(db);
  const cypherTool = createCypherTool(dataSource);

  const spaceId = SpaceId.random();
  const threadId = ObjectId.random();

  const result = await runLLM({
    aiClient,
    model: DEFAULT_EDGE_MODEL,
    tools: [cypherTool],
    spaceId,
    threadId,
    system: createSystemPrompt(schemaTypes),
    history: [
      createUserMessage(
        spaceId,
        threadId,
        'Query the database and give me all employees from DXOS organization that work on Composer and what their tasks are.',
      ),
    ],
    logger: createLogger({ stream: false }),
  });

  log('DONE', { result: result.result });
});
