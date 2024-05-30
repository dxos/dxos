//
// Copyright 2020 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { describe, test } from '@dxos/test';

import { sleep } from './timeout';
import { Trigger, TriggerState, trigger } from './trigger';

chai.use(chaiAsPromised);

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

  test('states are set correctly', async () => {
    const trigger = new Trigger<string>();

    expect(trigger.state).to.equal(TriggerState.WAITING);

    {
      const promise = trigger.wait();
      trigger.wake('test');
      expect(await promise).to.equal('test');
      expect(trigger.state).to.equal(TriggerState.RESOLVED);
    }

    {
      trigger.reset();
      expect(trigger.state).to.equal(TriggerState.WAITING);
    }

    {
      const error = new Error('Test error');
      const promise = trigger.wait();
      trigger.throw(error);
      await expect(promise).to.be.rejectedWith(error);
      expect(trigger.state).to.equal(TriggerState.REJECTED);
      trigger.reset();
      expect(trigger.state).to.equal(TriggerState.WAITING);
    }
  });
});
