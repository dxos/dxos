//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { randomBytes } from '@dxos/crypto';

import { DomainKey } from './domain-key';
import { DXN } from './dxn';

describe('DXN', () => {
  it('DomainKey', () => {
    expect(() => new DomainKey(randomBytes(24))).to.throw();
  });

  it('validateDomain', () => {
    // Valid.
    [
      'dxos',
      'dxos-prime',
      'a-b-c-d'
    ].forEach(domain => expect(DXN.validateDomain(domain), domain).length.greaterThanOrEqual(1));

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
    ].forEach(domain => expect(() => DXN.validateDomain(domain), domain).to.throw());
  });

  it('validateResource', () => {
    // Valid.
    [
      'x',
      'dxos',
      'foo/bar',
      'a/b/c/d',
      'A23456789-A23456789-A23456789-A23456789-A23456789-A23456789-A123' // Max length.
    ].forEach(resource => expect(DXN.validateResource(resource), resource).length.greaterThanOrEqual(1));

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
    ].forEach(resource => expect(() => DXN.validateResource(resource), resource).to.throw());
  });

  it('fromDomainKey', () => {
    const key = DomainKey.random();
    expect(DXN.fromDomainKey(key, 'dxos').key).not.to.be.undefined;
  });

  it('fromDomainName', () => {
    expect(DXN.fromDomainName('dxos', 'app/test').domain).not.to.be.undefined;
  });

  it('parse', () => {
    // Valid.
    [
      'example:foo/bar',
      '~c54fafc3888e5e864bb86c7ed2206dd86e542bab91fd3ed0160c8ccad50995f5:foo/bar'
    ].forEach(dxn => expect(String(DXN.parse(dxn)), dxn).to.equal(dxn));

    // Invalid.
    [
      '',
      'dxos',
      'dxos:',
      'example::foo/bar'
    ].forEach(dxn => expect(() => DXN.parse(dxn), dxn).to.throw());
  });

  it('urlencode/urldecode', () => {
    const dxn = DXN.parse('dxos:foo/bar');

    expect(DXN.urldecode(DXN.urlencode(dxn)).toString()).to.equal(dxn.toString());
  });
});
