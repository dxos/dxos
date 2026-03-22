//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Obj from './Obj';
import { TestSchema } from './testing';
import type * as Type from './Type';

describe('Exemplars', () => {
  test('factory', ({ expect }) => {
    const factory = <S extends Type.Obj.Any>(schema: S) => {
      return (props: Obj.MakeProps<S>) => Obj.make(schema, props);
    };

    const makePerson = factory(TestSchema.Person);
    const person = makePerson({ name: 'John Doe' });
    expect(person.name).toBe('John Doe');
  });
});
