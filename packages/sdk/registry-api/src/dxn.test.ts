//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import { randomBytes } from 'crypto';

import { DXN } from './dxn';
import { DomainKey } from './models';

describe('Dxn', () => {
  it('fromAddress', () => {
    const key = DomainKey.random();

    DXN.fromDomainKey(key, 'app');
    DXN.fromDomainKey(key, 'app.test');
    DXN.fromDomainKey(key, 'app-test');

    expect(() => new DomainKey(randomBytes(24))).to.throw;
    expect(() => DXN.fromDomainKey(key, 'app/test')).to.throw;
  });

  it('fromDomain', () => {
    DXN.fromDomainName('dxos', 'app');
    DXN.fromDomainName('dxos-test', 'app');

    expect(() => DXN.fromDomainName('dxos.test', 'app')).to.throw;
    expect(() => DXN.fromDomainName('dxos/test', 'app')).to.throw;
    expect(() => DXN.fromDomainName('~c54fafc3888e5e864bb86c7ed2206dd86e542bab91fd3ed0160c8ccad50995f5', 'app')).to.throw;
  });

  it('parse', () => {
    DXN.parse('dxos:app');
    DXN.parse('dxos:app.test');
    DXN.parse('~c54fafc3888e5e864bb86c7ed2206dd86e542bab91fd3ed0160c8ccad50995f5:app.test');

    expect(() => DXN.parse('dxos.com:app.test')).to.throw;
    expect(() => DXN.parse('foo')).to.throw;
  });
});
