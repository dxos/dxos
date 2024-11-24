//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { test } from 'vitest';

import { log } from '@dxos/log';

import { AnthropicBackend } from '../conversation/backend/anthropic';
import { runLLM } from '../conversation/conversation';
import { createUserMessage, defineTool, LLMToolResult } from '../conversation/types';
import { parseCypherQuery } from '../cypher/parser';
import { formatJsonSchemaForLLM } from '../cypher/schema';
import { Contact, Org, Project, Task } from './test-schema';
import { toJsonSchema } from '@dxos/echo-schema';

test('cypher query SDK', async () => {
  const cypherTool = defineTool({
    name: 'graphQuery',
    description: 'Query the ECHO graph database in cypher query language. Returns data from the database.',
    schema: S.Struct({
      query: S.String.annotations({
        description: `
        A valid cypher query string to execute.
        Supports MATCH, WHERE, and RETURN clauses.
        Examples:

        MATCH (n:Person) RETURN n, m

        MATCH (s:Studio)-[:PRODUCED]->(m:Movie)-[:PRODUCED_IN]->(c:City {name: "Las Vegas"}) RETURN s
        
        MATCH (a:Actor)-[:STARRED_IN]->(m:Movie)<-[:PRODUCED]-(s:Studio {name: "Cinema Pictures"}) WHERE m.name = "Once upon a time" RETURN m.name, a.name
        `,
      }),
    }),
    execute: async ({ query }) => {
      try {
        log.info('cypher query', { query });
        const parsed = parseCypherQuery(query);
        log.info('ast', { ast: parsed.ast });
        return LLMToolResult.Success(null);
      } catch (e: any) {
        return LLMToolResult.Error(e.message);
      }
    },
  });

  const schemaTypes = [Org, Project, Task, Contact];

  const result = await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    messages: [
      createUserMessage(`
        You have access to ECHO graph database. You can query the database to get data to satisfy user prompts.

        Database schema is defined in pseud-cypher syntax. The schema is:

        <schema>
          ${formatJsonSchemaForLLM(schemaTypes.map((schema) => toJsonSchema(schema)))}
        <schema>
        `),
      createUserMessage(
        'If you are missing data to satisfy the user request, use the available tools to get the data.',
      ),
      createUserMessage('Query the database and give me all employees from DXOS organization that work on Composer.'),
    ],
    tools: [cypherTool],
    backend,
  });

  log.info('', { result });
});

const backend = new AnthropicBackend({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});


// MATCH (org:Org {name: 'DXOS'})-[:ORG_EMPLOYEES]->(c:Contact)<-[:TASK_ASSIGNEE]-(t:Task)-[:TASK_PROJECT]->(p:Project {name: 'Composer'}) RETURN c.name