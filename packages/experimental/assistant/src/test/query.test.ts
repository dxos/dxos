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

  // TODO(dmaretskyi): Employee -> Contact.
  const result = await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    messages: [
      createUserMessage(`
        You have access to ECHO graph database. You can query the database to get data to satisfy user prompts.

        Available schema are: Org, Employee, Project, Task.

        Org(name: string)
        Employee(name: string)
        Project(name: string)

        Links:

        (org:Org)-[:HAS_EMPLOYEE]->(employee:Employee)
        (org:Org)-[:HAS_PROJECT]->(project:Project)
        (employee:Employee)-[:WORKS_ON]->(project:Project)
        
        
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
