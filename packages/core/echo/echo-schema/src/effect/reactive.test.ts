import { describe } from "@dxos/test"
import * as S from '@effect/schema/Schema';

export interface Reactive {} // Follows signal semantics.

export type ReactiveFn = {
  <T> (schema: S.Schema<T>): (obj: T) => T & Reactive;
  <T extends {}> (obj: T): T & Reactive;

  typed: <T> (schema: S.Schema<T>) => (obj: T) => T & Reactive;
}

declare const reactive: ReactiveFn;

describe('Reactive', () => {
  test('untyped', () => {
    const person = reactive({
      name: 'John',
      age: 42,
    })
  })

  test('typed', () => {
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

  test('storing to echo', () => {
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
