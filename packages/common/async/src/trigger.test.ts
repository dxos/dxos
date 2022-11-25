//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { trigger } from './trigger';

describe('trigger', function () {
  test('trigger', async function () {
    const [value, setValue] = trigger<any>();

    const t = setTimeout(() => setValue('test'), 10);

    const result = await value();
    expect(result).to.equal('test');
    clearTimeout(t);
  });
});
