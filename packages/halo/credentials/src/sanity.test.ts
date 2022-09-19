//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';

describe('Sanity tests', () => {
  it('Basic', async () => {
    console.log(Object.values(KeyType));
    expect(true).toBeTruthy();
  });
});
