//
// Copyright 2025 DXOS.org
//

import { JSONPath } from 'jsonpath-plus';
import { describe, test } from 'vitest';

describe('jsonpath', () => {
  test('should work', ({ expect }) => {
    expect(JSONPath({ json: { a: { b: { c: 1 } } }, path: '$.a.b.c' })).to.deep.eq([1]);
    expect(JSONPath({ json: { value: 0.4 }, path: '$[?(@ > 0.5)]' })).to.deep.equal([]);
    expect(JSONPath({ json: { value: 0.6 }, path: '$[?(@ > 0.5)]' })).to.deep.equal([0.6]);
  });
});
