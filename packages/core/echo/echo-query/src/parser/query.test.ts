//
// Copyright 2025 DXOS.org
//

import { type Tree } from '@lezer/common';
import { describe, it } from 'vitest';

import { Filter } from '@dxos/echo';

import { QueryDSL } from './gen';
import { QueryBuilder } from './query-builder';

// TODO(burdon): Ref/Relation traversal.

describe('query', () => {
  it('parse', ({ expect }) => {
    const queryParser = QueryDSL.Parser.configure({ strict: true });

    type Test = { input: string; expected: string[] };
    const tests: Test[] = [
      // TODO(burdon): Update builder.
      {
        input: '#test',
        expected: ['Query', 'Filter', 'TagFilter', 'Tag', 'Identifier'],
      },
      {
        input: 'type:dxos.org/type/Person',
        expected: [
          'Query',
          // type:dxos.org/type/Person
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        input: '{ name: "DXOS" }',
        expected: [
          'Query',
          // { name: "DXOS" }
          'Filter',
          'ObjectLiteral',
          '{',
          'ObjectProperty',
          'Identifier',
          ':',
          'Value',
          'String',
          '}',
        ],
      },
      {
        input: '{ value: 100 }',
        expected: [
          'Query',
          // { value: 100 }
          'Filter',
          'ObjectLiteral',
          '{',
          'ObjectProperty',
          'Identifier',
          ':',
          'Value',
          'Number',
          '}',
        ],
      },
      {
        input: '{ value: true }',
        expected: [
          'Query',
          // { value: true }
          'Filter',
          'ObjectLiteral',
          '{',
          'ObjectProperty',
          'Identifier',
          ':',
          'Value',
          'Boolean',
          '}',
        ],
      },
      {
        input: 'type:dxos.org/type/Person OR type:dxos.org/type/Organization',
        expected: [
          'Query',
          // type:dxos.org/type/Person
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
        input: '(type:dxos.org/type/Person OR type:dxos.org/type/Organization) AND { name: "DXOS" }',
        expected: [
          'Query',
          '(',
          // type:dxos.org/type/Person
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
          'Identifier',
          ':',
          'Value',
          'String',
          '}',
        ],
      },
      {
        input: 'type:dxos.org/type/Person => type:dxos.org/type/Organization',
        expected: [
          'Query',
          // type:dxos.org/type/Person
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          'Relation',
          'ArrowRight',
          // type:dxos.org/type/Organization
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        input: 'type:dxos.org/type/Organization <= type:dxos.org/type/Person',
        expected: [
          'Query',
          // type:dxos.org/type/Organization
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          'Relation',
          'ArrowLeft',
          // type:dxos.org/type/Person
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        // Persons for Organizations with name "DXOS"
        // TODO(burdon): Filter relations.
        input: '((type:dxos.org/type/Organization AND { name: "DXOS" }) => type:dxos.org/type/Person)',
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
          'Identifier',
          ':',
          'Value',
          'String',
          '}',
          ')',
          'Relation',
          'ArrowRight',
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          ')',
        ],
      },
    ];

    for (const { input, expected } of tests) {
      let tree: Tree;
      try {
        tree = queryParser.parse(input);
      } catch (err) {
        console.error(input, err);
        continue;
      }

      const cursor = tree.cursor();
      const result: string[] = [];
      do {
        result.push(cursor.node.name);
      } while (cursor.next());
      expect(result, input).toEqual(expected);
    }
  });

  it('build', ({ expect }) => {
    const queryBuilder = new QueryBuilder();

    type Test = { input: string; expected: Filter.Any };
    const tests: Test[] = [
      {
        input: 'type:dxos.org/type/Person',
        expected: Filter.typename('dxos.org/type/Person'),
      },
      {
        input: '#test',
        expected: Filter.tag('test'),
      },
      {
        input: '{ name: "DXOS" }',
        expected: Filter.props({ name: 'DXOS' }),
      },
      {
        input: '{ value: 100 }',
        expected: Filter.props({ value: 100 }),
      },
      {
        input: 'type:dxos.org/type/Person OR type:dxos.org/type/Organization',
        expected: Filter.or(Filter.typename('dxos.org/type/Person'), Filter.typename('dxos.org/type/Organization')),
      },
      {
        input: '(type:dxos.org/type/Person OR type:dxos.org/type/Organization) AND { name: "DXOS" }',
        expected: Filter.and(
          Filter.or(Filter.typename('dxos.org/type/Person'), Filter.typename('dxos.org/type/Organization')),
          Filter.props({ name: 'DXOS' }),
        ),
      },
    ];

    tests.forEach(({ input, expected }) => {
      const query = queryBuilder.build(input);
      expect(query, input).toEqual(expected);
    });
  });
});
