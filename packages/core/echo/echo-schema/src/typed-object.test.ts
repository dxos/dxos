//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Expando, TypedObject } from './typed-object';

describe('TypedObject', () => {
  test('instance of TypedObject', async () => {
    const obj = new TypedObject();
    expect(obj instanceof TypedObject).to.be.true;
  });

  test('instance of Expando', async () => {
    const obj = new Expando();
    expect(obj instanceof Expando).to.be.true;
  });
});
