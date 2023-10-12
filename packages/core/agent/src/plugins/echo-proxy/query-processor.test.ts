//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Bool, Op, type Query } from './query';
import { QueryProcessor } from './query-processor';

const q1: Query = {
  root: {
    op: Bool.OR,
    filter: {
      op: Op.EQ,
      type: 'org.dxos/type/test',
    },
  },
};

const q2: Query = {
  root: {
    op: Bool.NOT,
    predicates: [
      {
        op: Bool.OR,
        predicates: [
          {
            filter: {
              op: Op.EQ,
              key: 'count',
              value: 100,
            },
          },
          {
            filter: {
              op: Op.IN,
              key: 'count',
              value: [200, 300],
            },
          },
        ],
      },
    ],
  },
};

describe('queries', () => {
  test('basic', () => {
    const tests: [query: Query, count: number][] = [
      [q1, 0],
      [q2, 0],
    ];

    const processor = new QueryProcessor();
    tests.forEach(([query, count]) => {
      const objects = processor.query(query);
      expect(objects).to.have.length(count);
    });
  });
});
