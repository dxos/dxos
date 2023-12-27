import { describe } from "@dxos/test"
import * as S from '@effect/schema/Schema';
import { compositeRuntime } from '../util/signal';
import { expect } from "chai";


export interface Reactive {} // Follows signal semantics.

export type ReactiveFn = {
  <T extends {}> (obj: T): T & Reactive;
  // <T> (schema: S.Schema<T>): (obj: T) => T & Reactive;

  // typed: <T> (schema: S.Schema<T>) => (obj: T) => T & Reactive;
}

const proxies = new WeakMap<object, any>();

const reactive: ReactiveFn = <T> (target: any): T & Reactive => {
  const signal = compositeRuntime.createSignal();
  
  const proxy = new Proxy(target, {
    get(target, prop, receiver) {
      signal.notifyRead();
      const value = Reflect.get(target, prop, receiver);
      const existingProxy = proxies.get(value);
      if(existingProxy) {
        return existingProxy;
      }

      if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
        return reactive(value);
      }

      return value;
    },
    set(target, prop, value, receiver): boolean {
      const result = Reflect.set(target, prop, value, receiver);
      signal.notifyWrite();
      return result;
    }
  });
  proxies.set(target, proxy);
  return proxy;
}

describe.only('Reactive', () => {
  test('untyped', () => {
    const person = reactive({
      name: 'John',
      age: 42,
    })

    expect(person.age).to.equal(42);
    person.age = 53;
    expect(person.age).to.equal(53);
  })

  test.skip('typed', () => {
    const Person = S.struct({
      name: S.string,
      age: S.optional(S.number),
    });

    const person = reactive(Person)({
      name: 'John',
      age: 42,
    })

    person.age = 'unknown'; // Runtime error.
  })

  test.skip('storing to echo', () => {
    declare const db: any;

    const Person = S.struct({
      name: S.string,
      age: S.optional(S.number),
    });

    const person = reactive(Person)({
      name: 'John',
      age: 42,
    })

    db.add(person);

    person.age = 53; // Automerge mutation.
  });
})
