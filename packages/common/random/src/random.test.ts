//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Random } from './random';

describe('Random', () => {
  test('paragraphs', () => {
    const random = new Random();
    console.log(random.paragraph());
    expect(true).to.be.true;
  });
});
