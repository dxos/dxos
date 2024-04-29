//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Trigger, trigger } from './trigger';

describe('trigger', () => {
  test('trigger', async () => {
    const [value, setValue] = trigger<any>();

    const t = setTimeout(() => setValue('test'), 10);

    const result = await value();
    expect(result).to.equal('test');
    clearTimeout(t);
  });

  test('throw with not listeners does not cause unhandled rejection', async () => {
    const trigger = new Trigger();
    trigger.throw(new Error('test'));
  });
});
