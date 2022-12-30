//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { describe, test } from '@dxos/test';

import { Document } from './object';

describe('Document', () => {
  test('instance of', async () => {
    const obj = new Document();
    expect(obj instanceof Document).toBeTruthy();
  });
});
