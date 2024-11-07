//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { composeSchema } from './compose';
import { ECHO_REFINEMENT_KEY, toJsonSchema } from './json-schema';
import { FieldPath } from '../ast';
import { FormatAnnotationId, FormatEnum } from '../formats';
import { create, ref } from '../handler';
import { TypedObject } from '../object';
import { getTypename } from '../proxy';

describe('schema composition', () => {
  test('schema composition', ({ expect }) => {
    class BaseType extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String,
    }) {}

    const OverlaySchema = S.Struct({
      email: S.String.pipe(FieldPath('$.email')).annotations({
        [FormatAnnotationId]: FormatEnum.Email,
      }),
    });

    const baseSchema = toJsonSchema(BaseType);
    const overlaySchema = toJsonSchema(OverlaySchema);
    const composedSchema = composeSchema(baseSchema, overlaySchema);
    expect(composedSchema.properties).to.deep.eq({
      email: {
        type: 'string',
        format: FormatEnum.Email,
        [ECHO_REFINEMENT_KEY]: {
          annotations: {
            path: '$.email',
          },
        },
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
    log('schema', { org: toJsonSchema(Org), person: toJsonSchema(Person) });
    log('objects', { org, person });
    expect(getTypename(org)).to.eq(Org.typename);
    expect(getTypename(person)).to.eq(Person.typename);
  });
});
