//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import randomBytes from 'randombytes';

import { DomainKey } from './domain-key';

describe('DomainKey', () => {
  it('has key length of 32 bytes', () => {
    expect(() => new DomainKey(randomBytes(32))).to.not.throw();
  });

  it('throws with invalid key length', () => {
    expect(() => new DomainKey(randomBytes(24))).to.throw();
  });
});
