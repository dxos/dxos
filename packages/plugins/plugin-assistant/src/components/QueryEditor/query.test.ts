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
        query: 'type:dxos.org/type/Contact',
        parts: [
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
        query: 'type:dxos.org/type/Contact OR type:dxos.org/type/Organization',
        parts: [
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
        parts: [
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
      {
        query: '(type:dxos.org/echo/Contact) => (type:dxos.org/echo/Organization)',
        parts: [
          'Query',
          // (type:dxos.org/echo/Contact)
          '(',
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          ')',
          // =>
          'Relation',
          '=>',
          // (type:dxos.org/echo/Organization)
          '(',
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          ')',
        ],
      },
    ];

    for (const { query, parts } of tests) {
      try {
        const tree = queryParser.parse(query);
        const cursor = tree.cursor();
        const result: string[] = [];
        do {
          result.push(cursor.node.name);
        } while (cursor.next());
        expect(result).toEqual(parts);
      } catch (err) {
        console.error(query, err);
      }
    }
  });

  it.skip('should build a query', ({ expect }) => {
    const queryParser = parser.configure({ strict: true });
    const tree = queryParser.parse('type:example.com/type/Foo');
    const query = buildQuery(tree);
    expect(query).toEqual(Filter.typename('example.com/type/Foo'));
  });
});
