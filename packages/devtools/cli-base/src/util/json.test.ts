//
// Copyright 2023 DXOS.org
//

import { describe, test } from 'vitest';

import { stringify } from './json';

describe('json', () => {
  test('json', () => {
    const str = stringify({ a: 100, b: { c: 'test', d: 200 } });
    console.log(str);
  });
});
