//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { evalQuery } from './query';

describe('evalQuery', () => {
  it('should evaluate a query string', () => {
    const query = evalQuery('Query.select(Filter.type(Person.Person))');
    expect(query.ast).toMatchInlineSnapshot(`
      {
        "filter": {
          "id": undefined,
          "props": {},
          "type": "object",
          "typename": "dxn:type:dxos.org/type/Person:0.1.0",
        },
        "type": "select",
      }
    `);
  });
});
