//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { composeSchema } from './compose';
import { toJsonSchema } from './json-schema';
import { create, ref } from '../handler';
import { TypedObject } from '../object';
import { getTypename } from '../proxy';

// TODO(burdon): Add expects.
// TODO(burdon): Move tests to echo-schema?
describe('schema composition', () => {
  test('schema composition', ({ expect }) => {
    class BaseType extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String,
    }) {}

    const OverlaySchema = S.Struct({
      email: S.String.annotations({ [AST.TitleAnnotationId]: 'Email' }),
    });

    const baseSchema = toJsonSchema(BaseType);
    const overlaySchema = toJsonSchema(OverlaySchema);
    const composedSchema = composeSchema(baseSchema as any, overlaySchema as any);

    // TODO(burdon): Remove any cast?
    expect((composedSchema as any).properties).toEqual({
      email: {
        type: 'string',
        title: 'Email',
      },
    });
  });

  test('static schema definitions with references', async ({ expect }) => {
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      name: S.String,
    }) {}

    class Person extends TypedObject({ typename: 'example.com/type/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String,
      org: ref(Org),
    }) {}

    const org = create(Org, { name: 'Org' });
    const person = create(Person, { name: 'John', email: 'john@example.com', org });
    // log.info('schema', { org: toJsonSchema(Org), person: toJsonSchema(Person) });
    // log.info('objects', { org, person });
    expect(getTypename(org)).to.eq(Org.typename);
    expect(getTypename(person)).to.eq(Person.typename);
  });
});
