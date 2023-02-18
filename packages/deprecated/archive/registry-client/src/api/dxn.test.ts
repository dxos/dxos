//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { DomainKey } from './domain-key';
import { DXN } from './dxn';

const VALID_AUTHORITY = 'example';
const VALID_PATH = 'valid/path';
const VALID_TAG = 'valid-tag';

describe('DXN', () => {
  test('validates domain name', () => {
    // Valid.
    ['dxos', 'dxos-prime', 'a-b-c-d'].forEach((domainName) =>
      expect(() => DXN.fromDomainName(domainName, VALID_PATH)).to.not.throw()
    );

    // Invalid.
    [
      '',
      ' ',
      'x y',
      '4chan',
      '-dxos',
      'dxos-',
      'foo--bar',
      'c54fafc3888e5e864bb86c7ed2206dd86e542bab91fd3ed0160c8ccad50995f5'
    ].forEach((domainName) => expect(() => DXN.fromDomainName(domainName, VALID_PATH)).to.throw());
  });

  test('validates path', () => {
    // Valid.
    [
      'x',
      'dxos',
      'foo/bar',
      'a/b/c/d',
      'A23456789-A23456789-A23456789-A23456789-A23456789-A23456789-A123' // Max length.
    ].forEach((path) => expect(() => DXN.fromDomainName(VALID_AUTHORITY, path)).to.not.throw());

    // Invalid.
    [
      '',
      ' ',
      'x y',
      '1000',
      '4chan',
      '-dxos',
      'dxos-',
      'foo.bar',
      'foo_bar',
      'foo--bar',
      '/dxos',
      'dxos/',
      'foo//bar',
      'A23456789.A23456789.A23456789.A23456789.A23456789.A23456789.A1234', // Max length.
      '~c54fafc3888e5e864bb86c7ed2206dd86e542bab91fd3ed0160c8ccad50995f5' // TODO(burdon): ???
    ].forEach((path) => expect(() => DXN.fromDomainName(VALID_AUTHORITY, path)).to.throw());
  });

  test('fromDomainKey', () => {
    const key = DomainKey.random();
    expect(DXN.fromDomainKey(key, VALID_PATH).authority).not.to.be.undefined;
  });

  test('parse', () => {
    // Valid.
    [
      `${VALID_AUTHORITY}:${VALID_PATH}@${VALID_TAG}`,
      'example:foo/bar',
      '0xc54fafc3888e5e864bb86c7ed2206dd86e542bab91fd3ed0160c8ccad50995f5:foo/bar'
    ].forEach((dxn) => expect(String(DXN.parse(dxn)), dxn).to.equal(dxn));

    // Invalid.
    ['', 'dxos', 'dxos:', 'example::foo/bar', 'example:path@'].forEach((dxn) =>
      expect(() => DXN.parse(dxn), dxn).to.throw()
    );
  });

  test('urlencode/urldecode', () => {
    [
      'example:app/path@2.0.1',
      'example:app/path@2-alpha',
      'dxos:foo/bar',
      '0xc54fafc3888e5e864bb86c7ed2206dd86e542bab91fd3ed0160c8ccad50995f5:foo/bar'
    ]
      .map(DXN.parse)
      .forEach((name) => expect(DXN.urldecode(DXN.urlencode(name)).toString()).to.equal(name.toString()));
  });
});
