//
// Copyright 2024 DXOS.org
//

/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */

import { createRequire } from 'node:module';
import { type Parjser } from 'parjs';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import {
  cypherQuery,
  identifier,
  matchClause,
  nodePattern,
  properties,
  returnClause,
  whereClause,
} from './combinators';

describe('Cypher Combinators', () => {
  // TODO(dmaretskyi): Must be like this or it breaks vitest.
  const require = createRequire(import.meta.url);
  const { string, regexp, whitespace } = require('parjs') as typeof import('parjs');
  const { between, many, manySepBy, or, map, then, recover } =
    require('parjs/combinators') as typeof import('parjs/combinators');

  test('string', ({ expect }) => {
    expect(string('hello').parse('hello')).toMatchObject({ isOk: true });
  });

  test('string with whitespace', ({ expect }) => {
    const ws = whitespace(); // Parses whitespace
    // many;
    // const optionalWs = many(100)(ws);

    expect(string('hello').parse('hello')).toMatchObject({ isOk: true });
  });

  test('optional vairable tag', ({ expect }) => {
    const node = identifier.pipe(
      then(':'),
      recover(() => ({ kind: 'Soft' })),
      or(''),
      then(identifier),
      between('(', ')'),
    );
    const relation = identifier.pipe(
      then(':'),
      recover(() => ({ kind: 'Soft' })),
      or(''),
      then(identifier),
      between('[', ']'),
    );
    const parser = or(node)(relation);
    const input = '[a:b]';
    const result = parser.parse(input);
    log('result', { result });
  });

  test('properties', ({ expect }) => {
    const input = "{name: 'John'}";
    const result = properties.parse(input);
    log('result', { result });
    expect(result).toMatchObject({ isOk: true });
  });

  test('node pattern', ({ expect }) => {
    testParser(nodePattern, '(:Person)');
    testParser(nodePattern, '(n:Person)');
    testParser(nodePattern, "(n:Person {name: 'John'})");
  });

  test('match clause', ({ expect }) => {
    testParser(matchClause, 'MATCH (n:Person)');
    testParser(matchClause, 'MATCH (n:Person)-[r:KNOWS]->(m:Person)');
    testParser(matchClause, 'MATCH (o:Organization)-[:HAS_EMPLOYEE]->(e:Employee)');
  });

  test('where clause', ({ expect }) => {
    testParser(whereClause, 'WHERE n.name = "John"');
    testParser(whereClause, 'WHERE o.name = "DXOS" AND p.name = "Composer"');
  });

  test('return clause', ({ expect }) => {
    testParser(returnClause, 'RETURN n, m');
    testParser(returnClause, 'RETURN m.name AS employee');

    const cases = ['RETURN n, m'];
    for (const input of cases) {
      const result = returnClause.parse(input);
      log('result', { result });
      expect(result).toMatchObject({ isOk: true });
    }
  });

  test('query', async ({ expect }) => {
    testParser(cypherQuery, 'MATCH (n:Person) RETURN n');
    testParser(
      cypherQuery,
      `
      MATCH (n:Person {name: 'John'})-[r:KNOWS]->(m:Person)
      RETURN n, m
    `,
    );
    testParser(
      cypherQuery,
      `
      MATCH (n:Person)-[r:KNOWS]->(m:Person)
      WHERE n.name = "John"
      RETURN n, m
    `,
    );
    testParser(
      cypherQuery,
      'MATCH (o:Organization)-[:HAS_EMPLOYEE]->(e:Employee)-[:WORKS_ON]->(p:Project) WHERE o.name = "DXOS" AND p.name = "Composer" RETURN e.name, e.id, p.name, p.id',
    );
    testParser(
      cypherQuery,
      'MATCH (n:Organization {name: "DXOS"})-[:HAS_EMPLOYEE]->(m:Employee)<-[:WORKS_ON]-(p:Project {name: "Composer"}) RETURN m.name AS employee',
    );
    testParser(
      cypherQuery,
      "MATCH (org:Organization {name: 'DXOS'})-[:ORG_EMPLOYEES]->(c:Contact)<-[:TASK_ASSIGNEE]-(t:Task)-[:TASK_PROJECT]->(p:Project {name: 'Composer'}) RETURN c.name",
    );
  });
});

const testParser = (parser: Parjser<any>, input: string) => {
  const result = parser.parse(input);
  if (!result.isOk) {
    throw new Error(`Failed to parse: ${result}`);
  }
};
