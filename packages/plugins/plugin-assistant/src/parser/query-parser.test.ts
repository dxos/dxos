//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { QueryParser } from './query-parser';

describe('QueryParser', () => {
  test('simple queries', ({ expect }) => {
    {
      const parser = new QueryParser('type:Person');
      const ast = parser.parse();
      expect(ast).toEqual({
        type: 'binary',
        operator: 'EQ',
        left: {
          type: 'identifier',
          name: 'type',
        },
        right: {
          type: 'literal',
          value: 'Person',
        },
      });
    }
    {
      const parser = new QueryParser('$title = "foo"');
      const ast = parser.parse();
      expect(ast).toEqual({
        type: 'binary',
        operator: 'EQ',
        left: {
          name: '$title',
          type: 'identifier',
        },
        right: {
          type: 'literal',
          value: 'foo',
        },
      });
    }
  });

  test('complex query', ({ expect }) => {
    const parser = new QueryParser('(type:Person OR type:Organization) AND $title = "DXOS" AND $ts < TODAY');
    const ast = parser.parse();
    expect(ast).toEqual({
      left: {
        left: {
          left: {
            left: {
              name: 'type',
              type: 'identifier',
            },
            operator: 'EQ',
            right: {
              type: 'literal',
              value: 'Person',
            },
            type: 'binary',
          },
          operator: 'OR',
          right: {
            left: {
              name: 'type',
              type: 'identifier',
            },
            operator: 'EQ',
            right: {
              type: 'literal',
              value: 'Organization',
            },
            type: 'binary',
          },
          type: 'binary',
        },
        operator: 'AND',
        right: {
          left: {
            name: '$title',
            type: 'identifier',
          },
          operator: 'EQ',
          right: {
            type: 'literal',
            value: 'DXOS',
          },
          type: 'binary',
        },
        type: 'binary',
      },
      operator: 'AND',
      right: {
        left: {
          name: '$ts',
          type: 'identifier',
        },
        operator: 'LT',
        right: {
          type: 'literal',
          value: 'TODAY',
        },
        type: 'binary',
      },
      type: 'binary',
    });
  });
});
