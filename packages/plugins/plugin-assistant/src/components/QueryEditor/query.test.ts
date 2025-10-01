//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { Filter } from '@dxos/echo';

import { parser } from './gen';
import { buildQuery } from './query-builder';

// TODO(burdon): Generate query + test.
// TODO(burdon): Ref/Relation traversal.
// TODO(burdon): Factor out.

describe('query', () => {
  it('should parse a simple query', ({ expect }) => {
    const queryParser = parser.configure({ strict: true });

    const tests = [
      {
        query: 'type:foo',
        parts: [
          'Query',
          // type:foo
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        query: '{ name: "DXOS" }',
        parts: [
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
        parts: [
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
        parts: [
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
        query: 'type:foo OR type:bar',
        parts: [
          'Query',
          // type:foo
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          // OR
          'Or',
          // type:bar
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        query: '(type:foo OR type:bar) AND { name: "DXOS" }',
        parts: [
          'Query',
          '(',
          // type:foo
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          // OR
          'Or',
          // type:bar
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          ')',
          // AND
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
      // {
      //   query: '(type:dxos.org/echo/Contact)',
      //   parts: ['Query', '(', 'Filter', 'TypeFilter', 'TypeKeyword', ':', 'Identifier', ')'],
      // },
    ];

    for (const { query, parts } of tests) {
      const tree = queryParser.parse(query);
      const cursor = tree.cursor();
      const result: string[] = [];
      do {
        result.push(cursor.node.name);
      } while (cursor.next());
      expect(result).toEqual(parts);
    }
  });

  it('should build a query', ({ expect }) => {
    const queryParser = parser.configure({ strict: true });
    const tree = queryParser.parse('type:example.com/type/Foo');
    const query = buildQuery(tree);
    expect(query).toEqual(Filter.typename('example.com/type/Foo'));
  });
});
