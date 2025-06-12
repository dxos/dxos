//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { QueryParser } from './query-parser';

describe('QueryParser', () => {
  test('empty', ({ expect }) => {
    const parser = new QueryParser('');
    expect(parser.parse()).toEqual({
      type: 'literal',
      value: '*',
    });
  });

  test('invalid queries', ({ expect }) => {
    const cases = [
      //
      '!',
      'X:',
      ':Y',
      'X;Y',
      'x==100',
    ];

    for (const query of cases) {
      const parser = new QueryParser(query);
      expect(() => parser.parse()).toThrow();
    }
  });

  test('valid queries', ({ expect }) => {
    const cases = [
      //
      '',
      'type:Person',
      '$title = "foo"',
      '(type:Person OR type:Organization) AND $title = "DXOS" AND $ts < TODAY',
    ];

    for (const query of cases) {
      const parser = new QueryParser(query);
      expect(parser.parse()).to.exist;
    }
  });

  test('simple queries', ({ expect }) => {
    const cases = [
      {
        query: 'type:Person',
        ast: {
          type: 'binary',
          operator: 'EQ',
          left: { type: 'identifier', name: 'type' },
          right: { type: 'literal', value: 'Person' },
        },
      },
      {
        query: '$title = "DXOS"',
        ast: {
          type: 'binary',
          operator: 'EQ',
          left: { type: 'identifier', name: '$title' },
          right: { type: 'literal', value: 'DXOS' },
        },
      },
      {
        query: '(type:Person OR type:Organization) AND $title = "DXOS" AND $ts < TODAY',
        ast: {
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
        },
      },
    ];

    for (const { query, ast } of cases) {
      const parser = new QueryParser(query);
      expect(parser.parse()).toEqual(ast);
    }
  });
});
