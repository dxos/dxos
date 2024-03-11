//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { afterTest, describe, test } from '@dxos/test';

import { Event } from './events';
import { MulticastObservable, Observable, PushStream } from './observable';
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

  test('wait', async () => {
    const stream = new PushStream<number>();
    const observable = new MulticastObservable(stream.observable);
    stream.next(1);
    stream.next(2);
    stream.complete();
    const result = await observable.wait();
    expect(result).to.deep.equal(2);
  });

  test('forEach', async () => {
    const observable = MulticastObservable.from([1, 2, 3]);
    const result: number[] = [];
    await observable.forEach((value) => {
      result.push(value);
    });
    expect(result).to.deep.equal([1, 2, 3]);
  });

  test('map', async () => {
    const observable = MulticastObservable.from([1, 2, 3]);
    const mapped = observable.map((value) => value * 2);
    const result: number[] = [];
    await mapped.forEach((value) => {
      result.push(value);
    });
    expect(result).to.deep.equal([2, 4, 6]);
  });

  test('map stream', async () => {
    const stream = new PushStream<number>();
    const observable = new MulticastObservable(stream.observable);
    const mapped = observable.map((value) => value * 2);
    stream.next(1);
    stream.next(2);
    stream.next(3);
    const result = new Trigger<number>();
    const subscription = mapped.subscribe((value) => {
      result.wake(value);
    });
    afterTest(() => subscription.unsubscribe());
    expect(await result.wait()).to.deep.equal(6);
  });

  test('filter', async () => {
    const observable = MulticastObservable.from([1, 2, 3]);
    const filtered = observable.filter((value) => value % 2 === 0);
    const result: number[] = [];
    await filtered.forEach((value) => {
      result.push(value);
    });
    expect(result).to.deep.equal([2]);
  });

  test('reduce', async () => {
    const observable = MulticastObservable.from([1, 2, 3]);
    const reduced = observable.reduce((previousValue, currentValue) => previousValue + currentValue);
    const result = new Trigger<number>();
    const subscription = reduced.subscribe((value) => {
      result.wake(value);
    });
    afterTest(() => subscription.unsubscribe());
    expect(await result.wait()).to.deep.equal(6);
  });

  test('flatMap', async () => {
    const observable = MulticastObservable.from([[1], [2, 3]]);
    const flatMapped = observable.flatMap((value) => MulticastObservable.from(value));
    const result: number[] = [];
    await flatMapped.forEach((value) => {
      result.push(value);
    });
    expect(result).to.deep.equal([1, 2, 3]);
  });

  test('concat', async () => {
    const observable = MulticastObservable.from([1, 2, 3]);
    const concat = observable.concat(Observable.from([4, 5, 6]));
    const result: number[] = [];
    await concat.forEach((value) => {
      result.push(value);
    });
    expect(result).to.deep.equal([1, 2, 3, 4, 5, 6]);
  });

  test('lossless concat', async () => {
    const observable = MulticastObservable.of([1, 2, 3]);
    const concat = observable.losslessConcat((a: any, b: any) => a.concat(...b), MulticastObservable.of([4, 5, 6]));
    expect(concat.get()).to.deep.equal([1, 2, 3, 4, 5, 6]);
  });
});
