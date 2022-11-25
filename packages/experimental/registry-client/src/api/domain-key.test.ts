//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import randomBytes from 'randombytes';

import { describe, test } from '@dxos/test';

import { DomainKey } from './domain-key';

describe('DomainKey', function () {
  test('has key length of 32 bytes', function () {
    expect(() => new DomainKey(randomBytes(32))).to.not.throw();
  });

  test('throws with invalid key length', function () {
    expect(() => new DomainKey(randomBytes(24))).to.throw();
  });
});
