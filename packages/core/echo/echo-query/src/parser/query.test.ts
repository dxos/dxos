//
// Copyright 2025 DXOS.org
//

import { type Tree } from '@lezer/common';
import { describe, it } from 'vitest';

import { Filter, Tag } from '@dxos/echo';

import { QueryDSL } from './gen';
import { type BuildResult, QueryBuilder } from './query-builder';

// TODO(burdon): Ref/Relation traversal.

describe('query', () => {
  it('parse', ({ expect }) => {
    const queryParser = QueryDSL.Parser.configure({ strict: true });

    type Test = { input: string; expected: string[] };
    const tests: Test[] = [
      // Tags
      {
        input: '#foo',
        expected: ['Query', 'Filter', 'TagFilter', 'Tag'],
      },
      {
        input: '#foo AND #bar',
        expected: ['Query', 'Filter', 'TagFilter', 'Tag', 'And', 'Filter', 'TagFilter', 'Tag'],
      },
      {
        input: '#foo #bar',
        expected: ['Query', 'Filter', 'TagFilter', 'Tag', 'Filter', 'TagFilter', 'Tag'],
      },
      // Text
      {
        input: '"foo"',
        expected: ['Query', 'Filter', 'TextFilter', 'String'],
      },
      {
        input: '"foo" OR "bar"',
        expected: ['Query', 'Filter', 'TextFilter', 'String', 'Or', 'Filter', 'TextFilter', 'String'],
      },
      // Mixed
      {
        input: '#foo AND "bar"',
        expected: ['Query', 'Filter', 'TagFilter', 'Tag', 'And', 'Filter', 'TextFilter', 'String'],
      },
      {
        input: '#foo "bar"',
        expected: ['Query', 'Filter', 'TagFilter', 'Tag', 'Filter', 'TextFilter', 'String'],
      },
      // Type
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
      {
        input: 'x = ( type: dxos.org/type/Person )',
        expected: [
          'Query',
          'Assignment',
          'Identifier',
          '=',
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

    for (const { input, expected } of tests) {
      let tree: Tree;
      try {
        tree = queryParser.parse(input);
      } catch (err) {
        console.error(new Error(`Failed to parse: ${input}`, { cause: err }));
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
    const queryBuilder = new QueryBuilder({
      tag_1: Tag.make({ label: 'foo' }),
      tag_2: Tag.make({ label: 'bar' }),
    });

    // TODO(burdon): Test "not"
    type Test = { input: string; expected: BuildResult };
    const tests: Test[] = [
      // Types
      {
        input: 'type:dxos.org/type/Person',
        expected: {
          filter: Filter.typename('dxos.org/type/Person'),
        },
      },
      // Tags
      {
        input: '#foo',
        expected: {
          filter: Filter.tag('tag_1'),
        },
      },
      {
        input: '#foo AND #bar',
        expected: {
          filter: Filter.and(Filter.tag('tag_1'), Filter.tag('tag_2')),
        },
      },
      {
        input: '#foo #bar',
        expected: {
          filter: Filter.and(Filter.tag('tag_1'), Filter.tag('tag_2')),
        },
      },
      // Text
      {
        input: '"test"',
        expected: {
          filter: Filter.text('test'),
        },
      },
      // Mixed
      {
        input: '#foo "test"',
        expected: {
          filter: Filter.and(Filter.tag('tag_1'), Filter.text('test')),
        },
      },
      // Props
      {
        input: '{ name: "DXOS" }',
        expected: {
          filter: Filter.props({ name: 'DXOS' }),
        },
      },
      {
        input: '{ value: 100 }',
        expected: {
          filter: Filter.props({ value: 100 }),
        },
      },
      {
        input: 'type:dxos.org/type/Person OR type:dxos.org/type/Organization',
        expected: {
          filter: Filter.or(Filter.typename('dxos.org/type/Person'), Filter.typename('dxos.org/type/Organization')),
        },
      },
      {
        input: '(type:dxos.org/type/Person OR type:dxos.org/type/Organization) AND { name: "DXOS" }',
        expected: {
          filter: Filter.and(
            Filter.or(Filter.typename('dxos.org/type/Person'), Filter.typename('dxos.org/type/Organization')),
            Filter.props({ name: 'DXOS' }),
          ),
        },
      },
      {
        input: 'type:dxos.org/type/Person and { name: "DXOS" }',
        expected: {
          filter: Filter.and(Filter.typename('dxos.org/type/Person'), Filter.props({ name: 'DXOS' })),
        },
      },
      // Assignment
      {
        input: 'x = ( type:dxos.org/type/Person )',
        expected: {
          name: 'x',
          filter: Filter.typename('dxos.org/type/Person'),
        },
      },
      {
        input: 'x = ( #foo AND "bar" )',
        expected: {
          name: 'x',
          filter: Filter.and(Filter.tag('tag_1'), Filter.text('bar')),
        },
      },
      // TODO(burdon): Convert Query/Filter expr to AST.
      // TODO(burdon): Person -> Organization (many-to-many relation).
      // Get Research Note objects for Organization objects for Person objects with jobTitle.
      //
      // Cypher: MATCH (p:Person)-[:WorksAt]->(o:Organization)<-[:HasSubject]-(r:ResearchNote) WHERE p.jotTitle IS NOT NULL
      // ((type:Person AND { jobTitle: "investor" }) -[:WorksAt]-> type:Organization) <-[:HasSubject]- type:ResearchNote
      //
      // {
      //   input: '',
      //   expected: Query.select(Filter.typename('dxos.org/type/Person', { jobTitle: 'investor' }))
      //     .reference('organization')
      //     .targetOf(Relation.of('dxos.org/relation/HasSubject')) // TODO(burdon): Invert?
      //     .source(),
      // },
    ];

    tests.forEach(({ input, expected }) => {
      const result = queryBuilder.build(input);
      expect(result, JSON.stringify({ input, result, expected }, null, 2)).toEqual(expected);
    });
  });
});
