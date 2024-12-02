//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { log } from '@dxos/log';

import { SpaceId } from '@dxos/keys';
import { AIServiceClientImpl } from '../ai-service/client';
import { ObjectId } from '../ai-service/schema';
import { runLLM } from '../conversation/conversation';
import { createUserMessage } from '../conversation/types';
import { createLogger } from './logger';
import { createCypherTool, createSystemPrompt } from './query-promts';
import { createTestData } from './test-data';
import { Contact, Org, Project, Task } from './test-schema';

const ENDPOINT = 'http://localhost:8787';

const client = new AIServiceClientImpl({
  endpoint: ENDPOINT,
});

test('cypher query', async () => {
  const dataSource = createTestData();
  const schemaTypes = [Org, Project, Task, Contact];

  const cypherTool = createCypherTool(dataSource);

  const spaceId = SpaceId.random();
  const threadId = ObjectId.random();

  await client.insertMessages([
    createUserMessage(
      spaceId,
      threadId,
      'Query the database and give me all employees from DXOS organization that work on Composer and what their tasks are.',
    ),
  ]);

  const result = await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    tools: [cypherTool],
    spaceId,
    threadId,
    system: createSystemPrompt(schemaTypes),
    client,
    logger: createLogger({ stream: false }),
  });

  log.info('DONE', { result: result.result });
});
