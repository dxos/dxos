//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { afterTest, describe, test } from '@dxos/test';

import { Event } from './events';
import { MulticastObservable } from './observable';
import { Trigger } from './trigger';

describe('multicast observable', () => {
  test('gets current value', () => {
    const observable = MulticastObservable.of(1);
    expect(observable.get()).to.equal(1);
  });

  test('subscribe fires most recent value', async () => {
    const observable = MulticastObservable.of(1);
    const trigger = new Trigger();
    const subscription = observable.subscribe((value) => {
      expect(value).to.equal(1);
      trigger.wake();
    });
    afterTest(() => subscription.unsubscribe());
    await trigger.wait();
  });

  test('updates multiple observers', async () => {
    const event = new Event<object>();
    const initialValue = { example: 'test' };
    const observable = MulticastObservable.from(event, initialValue);

    const trigger1 = new Trigger<object>();
    const trigger2 = new Trigger<object>();

    const subscription1 = observable.subscribe((value) => {
      if (value !== initialValue) {
        trigger1.wake(value);
      }
    });
    const subscription2 = observable.subscribe((value) => {
      if (value !== initialValue) {
        trigger2.wake(value);
      }
    });

    afterTest(() => subscription1.unsubscribe());
    afterTest(() => subscription2.unsubscribe());

    const next = { new: 'value' };
    event.emit(next);

    const result1 = await trigger1.wait();
    const result2 = await trigger2.wait();

    expect(result1).to.equal(next);
    expect(result2).to.equal(next);
    expect(result1).to.equal(result2);
  });
});
