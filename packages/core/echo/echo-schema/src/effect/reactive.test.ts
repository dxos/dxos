import { test, describe } from '@dxos/test';
import * as S from '@effect/schema/Schema';
import { compositeRuntime } from '../util/signal';
import { expect } from 'chai';
import { effect } from '@preact/signals-core';

import { signal, batch } from '@preact/signals-core';

import { registerSignalRuntime as registerRuntimeForEcho } from '../util/signal';

{ // TODO(dmaretskyi): Resolve circular dependency on @dxos/echo-signals.
  registerRuntimeForEcho({
    createSignal: () => {
      const thisSignal = signal({});

      return {
        notifyRead: () => {
          const _ = thisSignal.value;
        },
        notifyWrite: () => {
          thisSignal.value = {};
        },
      };
    },
    batch,
  });
}

/**
 * Reactive object.
 * Accessing properties triggers signal semantics.
 */
export type Re<T> = { [K in keyof T]: T[K] }; //

export type ReactiveFn = {
  <T extends {}>(obj: T): Re<T>;
  // <T> (schema: S.Schema<T>): (obj: T) => T & Reactive;

  // typed: <T> (schema: S.Schema<T>) => (obj: T) => T & Reactive;
};

const proxyToObject = new WeakMap<object, any>();

const isSuitableProxyTarget = (value: any) => typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

const reactive: ReactiveFn = <T>(target: any): Re<T> => {
  if(!isSuitableProxyTarget(target)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  const existingProxy = proxyToObject.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const signal = compositeRuntime.createSignal();

  const proxy = new Proxy(target, {
    get(target, prop, receiver) {
      signal.notifyRead();
      const value = Reflect.get(target, prop, receiver);

      if (isSuitableProxyTarget(value)) {
        return reactive(value);
      }

      return value;
    },
    set(target, prop, value, receiver): boolean {
      const result = Reflect.set(target, prop, value, receiver);
      signal.notifyWrite();
      return result;
    },
  });

  proxyToObject.set(target, proxy);
  return proxy;
};

describe.only('Reactive', () => {
  test('untyped', () => {
    const person = reactive({
      name: 'John',
      age: 42,
    });

    expect(person.age).to.equal(42);
    person.age = 53;
    expect(person.age).to.equal(53);

    let timesRun = 0;
    effect(() => {
      person.age;
      timesRun++;
    });

    person.age = 54;

    expect(timesRun).to.equal(2);
  });

  test('deep reactivity', () => {
    class PhoneNumber {
      value: string = '';
    }

    const person = reactive({
      name: 'John',
      age: 42,
      address: {
        street: 'Main Street',
        city: 'London',
      },
      phone: new PhoneNumber(),
    });

    let timesRun = 0;
    effect(() => {
      person.address.city;
      person.phone.value;
      timesRun++;
    });

    person.address.city = 'New York';
    expect(timesRun).to.equal(2);

    // Non-plains objects are not reactive.
    person.phone.value = '123';
    expect(timesRun).to.equal(2);

    expect(person.address === person.address).to.be.true;
  });

  // test.skip('typed', () => {
  //   const Person = S.struct({
  //     name: S.string,
  //     age: S.optional(S.number),
  //   });

  //   const person = reactive(Person)({
  //     name: 'John',
  //     age: 42,
  //   });

  //   person.age = 'unknown'; // Runtime error.
  // });

  // test.skip('storing to echo', () => {
  //   declare const db: any;

  //   const Person = S.struct({
  //     name: S.string,
  //     age: S.optional(S.number),
  //   });

  //   const person = reactive(Person)({
  //     name: 'John',
  //     age: 42,
  //   });

  //   db.add(person);

  //   person.age = 53; // Automerge mutation.
  // });
});
