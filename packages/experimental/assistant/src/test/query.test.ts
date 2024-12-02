//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { test } from 'vitest';

import { toJsonSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { SpaceId } from '@dxos/keys';
import { AIServiceClientImpl } from '../ai-service/client';
import { ObjectId } from '../ai-service/schema';
import { runLLM } from '../conversation/conversation';
import { createUserMessage, defineTool, LLMToolResult } from '../conversation/types';
import { executeQuery } from '../cypher/query-executor';
import { formatJsonSchemaForLLM } from '../cypher/schema';
import { createLogger } from './logger';
import { createTestData } from './test-data';
import { Contact, Org, Project, Task } from './test-schema';

const ENDPOINT = 'http://localhost:8787';

const client = new AIServiceClientImpl({
  endpoint: ENDPOINT,
});

test('cypher query', async () => {
  const dataSource = createTestData();
  const schemaTypes = [Org, Project, Task, Contact];

  const cypherTool = defineTool({
    name: 'graphQuery',
    description: 'Query the ECHO graph database in cypher query language. Returns data from the database.',
    schema: S.Struct({
      query: S.String.annotations({
        description: `
        A valid cypher query string to execute.
        Query must have one MATCH clause.
        Match clause can have multiple patterns but they must all be connected via a relationship chain.
        Query might have zero or one WHERE clauses.
        Query must have one RETURN clause.
        RETURN clause can have multiple expressions separated by commas.
        DISTINCT keyword is not allowed.

        <example>
        MATCH (n:Person) RETURN n.name
        </example>

        <example>
        MATCH (s:Studio)-[:PRODUCED]->(m:Movie)-[:PRODUCED_IN]->(c:City {name: "Las Vegas"}) RETURN s
        </example>
        
        <example>
        MATCH (a:Actor)-[:STARRED_IN]->(m:Movie)<-[:PRODUCED]-(s:Studio {name: "Cinema Pictures"}) WHERE m.name = "Once upon a time" RETURN m.name, a.name
        </example>
        `,
      }),
    }),
    execute: async ({ query }) => {
      try {
        log('cypher query', { query });
        const results = await executeQuery(dataSource, query);
        log('query complete', { results });
        return LLMToolResult.Success(results);
      } catch (e: any) {
        return LLMToolResult.Error(e.message);
      }
    },
  });

  const spaceId = SpaceId.random();
  const threadId = ObjectId.random();

  await client.insertMessages([
    createUserMessage(
      spaceId,
      threadId,
      `
      You have access to ECHO graph database. You can query the database to get data to satisfy user prompts.

      Database schema is defined in pseud-cypher syntax. The schema is:

      <schema>
        ${formatJsonSchemaForLLM(schemaTypes.map((schema) => toJsonSchema(schema)))}
      <schema>
      `,
    ),
    createUserMessage(
      spaceId,
      threadId,
      'If you are missing data to satisfy the user request, use the available tools to get the data.',
    ),
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
    client,
    logger: createLogger({ stream: false }),
  });

  log.info('DONE', { result: result.result });
});
