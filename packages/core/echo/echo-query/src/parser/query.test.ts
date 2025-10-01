//
// Copyright 2025 DXOS.org
//

import { type Tree } from '@lezer/common';
import { describe, it } from 'vitest';

import { Filter } from '@dxos/echo';

import { parser } from './gen';
import { QueryBuilder } from './query-builder';

// TODO(burdon): Generate query + test.
// TODO(burdon): Ref/Relation traversal.
// TODO(burdon): Factor out.

describe('query', () => {
  it('should parse a simple query', ({ expect }) => {
    const queryParser = parser.configure({ strict: true });

    type Test = { query: string; expected: string[] };
    const tests: Test[] = [
      {
        query: 'type:dxos.org/type/Contact',
        expected: [
          'Query',
          // type:dxos.org/type/Contact
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        query: '{ name: "DXOS" }',
        expected: [
          'Query',
          // { name: "DXOS" }
          'Filter',
          'ObjectLiteral',
          '{',
          'ObjectProperty',
          'PropertyKey',
          'Identifier',
          ':',
          'Value',
          'String',
          '}',
        ],
      },
      {
        query: '{ value: 100 }',
        expected: [
          'Query',
          // { value: 100 }
          'Filter',
          'ObjectLiteral',
          '{',
          'ObjectProperty',
          'PropertyKey',
          'Identifier',
          ':',
          'Value',
          'Number',
          '}',
        ],
      },
      {
        query: '{ value: true }',
        expected: [
          'Query',
          // { value: true }
          'Filter',
          'ObjectLiteral',
          '{',
          'ObjectProperty',
          'PropertyKey',
          'Identifier',
          ':',
          'Value',
          'Boolean',
          '}',
        ],
      },
      {
        query: 'type:dxos.org/type/Contact OR type:dxos.org/type/Organization',
        expected: [
          'Query',
          // type:dxos.org/type/Contact
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          // OR
          'Or',
          // type:dxos.org/type/Organization
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        query: '(type:dxos.org/type/Contact OR type:dxos.org/type/Organization) AND { name: "DXOS" }',
        expected: [
          'Query',
          '(',
          // type:dxos.org/type/Contact
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          // OR
          'Or',
          // type:dxos.org/type/Organization
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          ')',
          'And',
          // { name: "DXOS" }
          'Filter',
          'ObjectLiteral',
          '{',
          'ObjectProperty',
          'PropertyKey',
          'Identifier',
          ':',
          'Value',
          'String',
          '}',
        ],
      },
      {
        query: 'type:dxos.org/type/Contact => type:dxos.org/type/Organization',
        expected: [
          'Query',
          // type:dxos.org/type/Contact
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          'Relation',
          '=>',
          // type:dxos.org/type/Organization
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        query: 'type:dxos.org/type/Organization <= type:dxos.org/type/Contact',
        expected: [
          'Query',
          // type:dxos.org/type/Organization
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          'Relation',
          '<=',
          // type:dxos.org/type/Contact
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        // Contacts for Organizations with name "DXOS"
        // TODO(burdon): Filter relations.
        query: '((type:dxos.org/type/Organization AND { name: "DXOS" }) => type:dxos.org/type/Contact)',
        expected: [
          'Query',
          '(',
          '(',
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          'And',
          'Filter',
          'ObjectLiteral',
          '{',
          'ObjectProperty',
          'PropertyKey',
          'Identifier',
          ':',
          'Value',
          'String',
          '}',
          ')',
          'Relation',
          '=>',
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          ')',
        ],
      },
    ];

    for (const { query, expected } of tests) {
      let tree: Tree;
      try {
        tree = queryParser.parse(query);
      } catch (err) {
        console.error(query, err);
        continue;
      }

      const cursor = tree.cursor();
      const result: string[] = [];
      do {
        result.push(cursor.node.name);
      } while (cursor.next());
      expect(result).toEqual(expected);
    }
  });

  it('should build a query', ({ expect }) => {
    const queryBuilder = new QueryBuilder();

    type Test = { input: string; expected: Filter.Any };
    const tests: Test[] = [
      {
        input: 'type:dxos.org/type/Contact',
        expected: Filter.typename('dxos.org/type/Contact'),
      },
      {
        input: '{ name: "DXOS" }',
        expected: Filter._props({ name: 'DXOS' }),
      },
      {
        input: '{ value: 100 }',
        expected: Filter._props({ value: 100 }),
      },
      {
        input: 'type:dxos.org/type/Contact OR type:dxos.org/type/Organization',
        expected: Filter.or(Filter.typename('dxos.org/type/Contact'), Filter.typename('dxos.org/type/Organization')),
      },
      {
        input: '(type:dxos.org/type/Contact OR type:dxos.org/type/Organization) AND { name: "DXOS" }',
        expected: Filter.and(
          Filter.or(Filter.typename('dxos.org/type/Contact'), Filter.typename('dxos.org/type/Organization')),
          Filter._props({ name: 'DXOS' }),
        ),
      },
    ];

    for (const { input, expected } of tests) {
      const query = queryBuilder.build(input);
      expect(query).toEqual(expected);
    }
  });
});
