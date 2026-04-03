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
        input: 'type:org.dxos.type.person',
        expected: [
          'Query',
          // type:org.dxos.type.person
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
        input: 'type:org.dxos.type.person OR type:org.dxos.type.organization',
        expected: [
          'Query',
          // type:org.dxos.type.person
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          // OR
          'Or',
          // type:org.dxos.type.organization
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        input: '(type:org.dxos.type.person OR type:org.dxos.type.organization) AND { name: "DXOS" }',
        expected: [
          'Query',
          '(',
          // type:org.dxos.type.person
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          // OR
          'Or',
          // type:org.dxos.type.organization
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
        input: 'type:org.dxos.type.person -> type:org.dxos.type.organization',
        expected: [
          'Query',
          // type:org.dxos.type.person
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          'Relation',
          'ArrowRight',
          // type:org.dxos.type.organization
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
        ],
      },
      {
        input: 'type:org.dxos.type.organization <- type:org.dxos.type.person',
        expected: [
          'Query',
          // type:org.dxos.type.organization
          'Filter',
          'TypeFilter',
          'TypeKeyword',
          ':',
          'Identifier',
          'Relation',
          'ArrowLeft',
          // type:org.dxos.type.person
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
        input: '((type:org.dxos.type.organization AND { name: "DXOS" }) -> type:org.dxos.type.person)',
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
        input: 'type:org.dxos.type.person and { name: "DXOS" }',
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
        input: 'x = ( type: org.dxos.type.person )',
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
        input: 'type:org.dxos.type.person',
        expected: {
          filter: Filter.typename('org.dxos.type.person'),
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
        input: 'type:org.dxos.type.person OR type:org.dxos.type.organization',
        expected: {
          filter: Filter.or(Filter.typename('org.dxos.type.person'), Filter.typename('org.dxos.type.organization')),
        },
      },
      {
        input: '(type:org.dxos.type.person OR type:org.dxos.type.organization) AND { name: "DXOS" }',
        expected: {
          filter: Filter.and(
            Filter.or(Filter.typename('org.dxos.type.person'), Filter.typename('org.dxos.type.organization')),
            Filter.props({ name: 'DXOS' }),
          ),
        },
      },
      {
        input: 'type:org.dxos.type.person and { name: "DXOS" }',
        expected: {
          filter: Filter.and(Filter.typename('org.dxos.type.person'), Filter.props({ name: 'DXOS' })),
        },
      },
      // Assignment
      {
        input: 'x = ( type:org.dxos.type.person )',
        expected: {
          name: 'x',
          filter: Filter.typename('org.dxos.type.person'),
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
      //   expected: Query.select(Filter.typename('org.dxos.type.person', { jobTitle: 'investor' }))
      //     .reference('organization')
      //     .targetOf(Relation.of('org.dxos.relation.hasSubject')) // TODO(burdon): Invert?
      //     .source(),
      // },
    ];

    tests.forEach(({ input, expected }) => {
      const result = queryBuilder.build(input);
      expect(result, JSON.stringify({ input, result, expected }, null, 2)).toEqual(expected);
    });
  });
});
