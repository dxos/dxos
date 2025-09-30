//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { parser } from './gen';

describe('query', () => {
  it('should parse a simple query', ({ expect }) => {
    const queryParser = parser.configure({
      strict: true,
    });

    // TODO(burdon): Ref/Relation traversal.

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
});
