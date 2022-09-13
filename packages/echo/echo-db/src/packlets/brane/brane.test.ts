//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it } from 'mocha';

import { Brane } from './brane';

describe('Brane', () => {
  it('Sanity', async () => {
    const brane = new Brane();
    expect(brane).toBeDefined();
  });
});
