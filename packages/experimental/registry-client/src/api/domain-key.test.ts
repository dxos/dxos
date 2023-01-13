//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import randomBytes from 'randombytes';

import { describe, test } from '@dxos/test';

import { DomainKey } from './domain-key';

describe('DomainKey', () => {
  test('has key length of 32 bytes', () => {
    expect(() => new DomainKey(randomBytes(32))).to.not.throw();
  });

  test('throws with invalid key length', () => {
    expect(() => new DomainKey(randomBytes(24))).to.throw();
  });
});
