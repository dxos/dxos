//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import randomBytes from 'randombytes';

import { DomainKey } from './domain-key.js';

describe('DomainKey', function () {
  it('has key length of 32 bytes', function () {
    expect(() => new DomainKey(randomBytes(32))).to.not.throw();
  });

  it('throws with invalid key length', function () {
    expect(() => new DomainKey(randomBytes(24))).to.throw();
  });
});
