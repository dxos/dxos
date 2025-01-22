//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { toJsonSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { defineTool, LLMToolResult } from '../conversation';
import { executeQuery, formatJsonSchemaForLLM, type DataSource } from '../cypher';
import { trim } from '../util';

export const createCypherTool = (dataSource: DataSource) =>
  defineTool({
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

export const createSystemPrompt = (schemaTypes: S.Schema.Any[]) => trim`
  You have access to ECHO graph database. You can query the database to get data to satisfy user prompts.

  Database schema is defined in pseud-cypher syntax. The schema is:

  <schema>
    ${formatJsonSchemaForLLM(schemaTypes.map((schema) => toJsonSchema(schema)))}
  <schema>

  Before replying always think step-by-step on how to proceed.
  Print your thoughts inside <cot> tags.
  
  <example>
    <cot>To answer the question I need to ...</cot>
  </example>

  Before answering the user's question, decide what tools you need to use to answer the question.
`;
