//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { describe, test } from '@dxos/test';

import { EchoObject } from './object';

describe('EchoObject', () => {
  test('instance of', async () => {
    const obj = new EchoObject();
    expect(obj instanceof EchoObject).toBeTruthy();
  });
});
