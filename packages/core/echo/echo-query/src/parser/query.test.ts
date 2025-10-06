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
      {
        input: '#test',
        expected: ['Query', 'Filter', 'TagFilter', 'Tag'],
      },
      {
        input: '"foo"',
        expected: ['Query', 'Filter', 'TextFilter', 'String'],
      },
      {
        input: '"foo" OR "bar"',
        expected: ['Query', 'Filter', 'TextFilter', 'String', 'Or', 'Filter', 'TextFilter', 'String'],
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
        input: 'type:dxos.org/type/Person -> type:dxos.org/type/Organization',
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
        input: 'type:dxos.org/type/Organization <- type:dxos.org/type/Person',
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
        input: '((type:dxos.org/type/Organization AND { name: "DXOS" }) -> type:dxos.org/type/Person)',
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
      {
        input: 'type:dxos.org/type/Person and { name: "DXOS" }',
        expected: [
          'Query',
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

    // TODO(burdon): Test "not"
    type Test = { input: string; expected: Filter.Any };
    const tests: Test[] = [
      // Type
      {
        input: 'type:dxos.org/type/Person',
        expected: Filter.typename('dxos.org/type/Person'),
      },
      // Tag
      {
        input: '#test',
        expected: Filter.tag('test'),
      },
      // Text
      {
        input: '"test"',
        expected: Filter.text('test'),
      },
      // Props
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
      {
        input: 'type:dxos.org/type/Person and { name: "DXOS" }',
        expected: Filter.and(Filter.typename('dxos.org/type/Person'), Filter.props({ name: 'DXOS' })),
      },
      // TODO(burdon): Convert Query/Filter expr to AST.
      // TODO(burdon): Person -> Organization (many-to-many relation).
      // Get Research Note objects for Organization objects for Person objects with jobTitle.
      //
      // Cypher: MATCH (p:Person)-[:WorksAt]->(o:Organization)<-[:ResearchOn]-(r:ResearchNote) WHERE p.jotTitle IS NOT NULL
      // ((type:Person AND { jobTitle: "investor" }) -[:WorksAt]-> type:Organization) <-[:ResearchOn]- type:ResearchNote
      //
      // {
      //   input: '',
      //   expected: Query.select(Filter.typename('dxos.org/type/Person', { jobTitle: 'investor' }))
      //     .reference('organization')
      //     .targetOf(Relation.of('dxos.org/relation/ResearchOn')) // TODO(burdon): Invert?
      //     .source(),
      // },
    ];

    tests.forEach(({ input, expected }) => {
      const query = queryBuilder.build(input);
      expect(query, input).toEqual(expected);
    });
  });
});
