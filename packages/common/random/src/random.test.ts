//
// Copyright 2023 DXOS.org
//

import { describe, test } from '@dxos/test';

import { random } from './random';

describe('Random', () => {
  test('paragraphs', () => {
    random.seed('test');
    const values = random.int({ min: 0, max: 10, count: 10 });
    console.log(values);
  });
});
