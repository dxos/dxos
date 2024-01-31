//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { random } from './random';

random.seed('test');

describe('Random', () => {
  test('text', () => {
    expect(random.util.multiple(5, random.text.word)).to.have.lengthOf(5);
    expect(random.util.multiple(3, random.text.sentence)).to.have.lengthOf(3);
    expect(random.util.multiple(2, random.text.paragraph)).to.have.lengthOf(2);
  });

  test('type', () => {
    expect(random.type.array(-1, () => true)).to.have.lengthOf(0);
    expect(random.type.array(10, (i) => `${random.text.word()}-${i}`)).to.have.lengthOf(10);
    expect(random.util.multiple(10, random.type.boolean)).to.have.lengthOf(10);
    expect(random.util.multiple(10, random.type.integer)).to.have.lengthOf(10);
    expect(random.util.multiple(10, random.type.float)).to.have.lengthOf(10);
  });

  test('date', () => {
    expect(random.util.multiple(10, random.date.recent)).to.have.lengthOf(10);
  });

  test('string', () => {
    expect(random.util.multiple(5, () => random.string.hexadecimal({ length: 4 }))).to.have.lengthOf(5);
    expect(random.util.multiple(5, () => random.string.uuid())).to.have.lengthOf(5);
  });

  test('unique', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'e'];
    expect(random.util.uniqueArray(values, -1)).to.have.lengthOf(0);
    expect(random.util.uniqueArray(values, 0)).to.have.lengthOf(0);
    expect(random.util.uniqueArray(values, 2)).to.have.lengthOf(2);
    expect(random.util.uniqueArray(values, 10)).to.have.lengthOf(5);
  });
});
