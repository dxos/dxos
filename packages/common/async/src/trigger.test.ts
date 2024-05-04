//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { sleep } from './timeout';
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
    trigger.wake();
    trigger.throw(new Error('Test error'));
    trigger.reset();
    await sleep(10);
  });
});
