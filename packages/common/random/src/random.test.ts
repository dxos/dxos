//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { random } from './random';

random.seed('test');

describe('Random', () => {
  test('text', () => {
    console.log(random.multiple(5, random.text.word));
    console.log(random.multiple(3, random.text.sentence));
    console.log(random.multiple(2, random.text.paragraph));
  });

  test('types', () => {
    console.log(random.multiple(10, random.type.boolean));
    console.log(random.multiple(10, random.type.number));
    console.log(random.multiple(10, random.type.float));
  });

  test('array', () => {
    console.log(random.array(10, (i) => `${random.text.word()}-${i}`));
  });

  test('unique', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'e'];
    expect(random.unique(values, 0)).to.have.lengthOf(0);
    expect(random.unique(values, 2)).to.have.lengthOf(2);
    expect(random.unique(values, 10)).to.have.lengthOf(5);
  });
});
