//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { TestObjectGenerator } from './generator';

describe('sanity', () => {
  test('basic', () => {
    const generator = new TestObjectGenerator();
    const object = generator.createObject();
    expect(object).to.exist;
  });
});
