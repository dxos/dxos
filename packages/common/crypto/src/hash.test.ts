// DXOS testing browser.

//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { ripemd160, sha1, sha256, sha512 } from './hash';

it('SHA1', function () {
  const hashed = sha1('Test message');
  expect(hashed).to.equal('8de39b4722207f2da2a831e8734f02e740c15738');
});

it('SHA256', function () {
  const hashed = sha256('Test message');
  expect(hashed).to.equal(
    'c0719e9a8d5d838d861dc6f675c899d2b309a3a65bb9fe6b11e5afcbf9a2c0b1'
  );
});

it('SHA512', function () {
  const hashed = sha512('Test message');
  expect(hashed).to.equal(
    '48418241a4d779508a6b98e623328a68f7f0bf27fd101bb2c89384827bfc0740' +
      '3fefd5855576f1824fcd7acd233541514240c2bcf0fa9732ebb8f166a7c38bdf'
  );
});

it('RIPEMD160', function () {
  const hashed = ripemd160('Test message');
  expect(hashed).to.equal('24b83e2457880c95d2e3c3c6b98e24ab170b1e11');
});
