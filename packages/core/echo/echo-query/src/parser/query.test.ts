//
// Copyright 2025 DXOS.org
//

import { type Tree } from '@lezer/common';
import { describe, it } from 'vitest';

import { type QueryAST } from '@dxos/echo';

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
        expected: ['Query', 'Filter', 'TagFilter', 'Tag', 'Tagname'],
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
        input: 'type:dxos.org/type/Person And { name: "DXOS" }',
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

    type Test = { input: string; expected: QueryAST.Query };
    const tests: Test[] = [
      {
        input: 'type:dxos.org/type/Person',
        expected: {
          type: 'select',
          filter: {
            type: 'object',
            typename: 'dxn:type:dxos.org/type/Person',
            props: {},
          },
        },
      },
      {
        input: '#test',
        expected: {
          type: 'select',
          filter: {
            type: 'tag',
            tag: 'test',
          },
        },
      },
      {
        input: '{ name: "DXOS" }',
        expected: {
          type: 'select',
          filter: {
            type: 'object',
            typename: null,
            props: {
              name: {
                type: 'compare',
                operator: 'eq',
                value: 'DXOS',
              },
            },
          },
        },
      },
      {
        input: '{ value: 100 }',
        expected: {
          type: 'select',
          filter: {
            type: 'object',
            typename: null,
            props: {
              value: {
                type: 'compare',
                operator: 'eq',
                value: 100,
              },
            },
          },
        },
      },
      {
        input: 'type:dxos.org/type/Person OR type:dxos.org/type/Organization',
        expected: {
          type: 'select',
          filter: {
            type: 'or',
            filters: [
              {
                type: 'object',
                typename: 'dxn:type:dxos.org/type/Person',
                props: {},
              },
              {
                type: 'object',
                typename: 'dxn:type:dxos.org/type/Organization',
                props: {},
              },
            ],
          },
        },
      },
      {
        input: '(type:dxos.org/type/Person OR type:dxos.org/type/Organization) AND { name: "DXOS" }',
        expected: {
          type: 'select',
          filter: {
            type: 'and',
            filters: [
              {
                type: 'or',
                filters: [
                  {
                    type: 'object',
                    typename: 'dxn:type:dxos.org/type/Person',
                    props: {},
                  },
                  {
                    type: 'object',
                    typename: 'dxn:type:dxos.org/type/Organization',
                    props: {},
                  },
                ],
              },
              {
                type: 'object',
                typename: null,
                props: {
                  name: {
                    type: 'compare',
                    operator: 'eq',
                    value: 'DXOS',
                  },
                },
              },
            ],
          },
        },
      },
      {
        input: 'type:dxos.org/type/Person and { name: "DXOS" }',
        expected: {
          type: 'select',
          filter: {
            type: 'and',
            filters: [
              {
                type: 'object',
                typename: 'dxn:type:dxos.org/type/Person',
                props: {},
              },
              {
                type: 'object',
                typename: null,
                props: {
                  name: {
                    type: 'compare',
                    operator: 'eq',
                    value: 'DXOS',
                  },
                },
              },
            ],
          },
        },
      },
      {
        input: 'type:dxos.org/type/Person And { name: "DXOS" }',
        expected: {
          type: 'select',
          filter: {
            type: 'and',
            filters: [
              {
                type: 'object',
                typename: 'dxn:type:dxos.org/type/Person',
                props: {},
              },
              {
                type: 'object',
                typename: null,
                props: {
                  name: {
                    type: 'compare',
                    operator: 'eq',
                    value: 'DXOS',
                  },
                },
              },
            ],
          },
        },
      },
      // TODO(wittjosiah): Support reference and relation traversals.
      // {
      //   input: '',
      //   expected: {
      //     type: 'relation-traversal',
      //     anchor: {
      //       type: 'relation',
      //       anchor: {
      //         type: 'reference-traversal',
      //         anchor: {
      //           type: 'select',
      //           filter: {
      //             type: 'object',
      //             typename: 'dxn:type:dxos.org/type/Person:0.1.0',
      //             props: {
      //               jobTitle: {
      //                 type: 'compare',
      //                 operator: 'eq',
      //                 value: 'investor',
      //               },
      //             },
      //           },
      //         },
      //         property: 'organization',
      //       },
      //       direction: 'incoming',
      //       filter: {
      //         type: 'object',
      //         typename: 'dxn:type:dxos.org/relation/ResearchOn:0.1.0',
      //         props: {},
      //       },
      //     },
      //     direction: 'source',
      //   },
      // },
    ];

    tests.forEach(({ input, expected }) => {
      const query = queryBuilder.build(input);
      expect(query!.ast, input).toEqual(expected);
    });
  });
});
