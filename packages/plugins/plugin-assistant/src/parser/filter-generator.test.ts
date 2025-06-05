//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter } from '@dxos/echo-schema';

import { generateFilter } from './filter-generator';
import { QueryParser } from './query-parser';

describe('FilterGenerator', () => {
  test('simple queries', ({ expect }) => {
    const parser = new QueryParser('type:example.com/type/Person');
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
        value: 'example.com/type/Person',
      },
    });

    const filter = generateFilter(ast);
    expect(filter).toEqual(Filter.typename('example.com/type/Person'));
  });
});
