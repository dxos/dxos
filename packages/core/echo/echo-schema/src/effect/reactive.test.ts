//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { effect, signal, batch } from '@preact/signals-core';
import { expect } from 'chai';

import { test, describe } from '@dxos/test';

import { reactive } from './reactive';
import { registerSignalRuntime as registerRuntimeForEcho } from '../util/signal';

{
  // TODO(dmaretskyi): Resolve circular dependency on @dxos/echo-signals.
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

    expect(person.address === person.address, 'Proxies have stable references').to.be.true;
  });

  test.only('typed', () => {
    const Person = S.struct({
      name: S.string,
      age: S.optional(S.number),
      address: S.struct({
        street: S.string,
        city: S.string,
      }).pipe(S.optional),
    });
    type Person = S.Schema.To<typeof Person>;

    const person = reactive(Person, {
      name: 'John',
      age: 42,
      address: {
        street: 'Main Street',
        city: 'London',
      },
    });

    person.name = 'John Doe';

    expect(() => {
      (person as any).address.city = 42; // Runtime error.
    }).to.throw();
  });

  // test.skip('storing to echo', () => {
  //   declare const db: any;

  //   const Person = S.struct({
  //     name: S.string,
  //     age: S.optional(S.number),
  //   });

  //   const person = reactive(Person, {
  //     name: 'John',
  //     age: 42,
  //   });

  //   db.add(person);

  //   person.age = 53; // Automerge mutation.
  // });
});
