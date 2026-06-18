//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Query from './Query';

describe('evalQuery', () => {
  test('should evaluate a query string', () => {
    const query = Query.evalQuery('Query.select(Filter.type(Person.Person))');
    expect(query.ast).toMatchInlineSnapshot(`
      {
        "filter": {
          "id": undefined,
          "props": {},
          "type": "object",
          "typename": "dxn:org.dxos.type.person:0.1.0",
        },
        "type": "select",
      }
    `);
  });
});
