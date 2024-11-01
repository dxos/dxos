//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { describe, test } from 'vitest';

import {
  composeSchema,
  create,
  createStoredSchema,
  createReferenceAnnotation,
  getTypename,
  setProperty,
  toJsonSchema,
  ref,
  type JsonPath,
  TypedObject,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { FieldKind, FieldPath, FieldKindEnum, FILED_KIND_ANNOTATION, FILED_PATH_ANNOTATION } from './annotations';
import { ViewSchema } from './view';

describe('schema composition', () => {
  test('schema composition', ({ expect }) => {
    class BaseType extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String,
    }) {}

    const OverlaySchema = S.Struct({
      email: S.String.pipe(FieldPath('$.email' as JsonPath)).pipe(FieldKind(FieldKindEnum.Email)),
    });

    const baseSchema = toJsonSchema(BaseType);
    const overlaySchema = toJsonSchema(OverlaySchema);
    const composedSchema = composeSchema(baseSchema, overlaySchema);

    // TODO(burdon): Remove any cast?
    expect((composedSchema as any).properties).toEqual({
      email: {
        type: 'string',
        echo: {
          annotations: {
            [FILED_KIND_ANNOTATION]: FieldKindEnum.Email,
            [FILED_PATH_ANNOTATION]: '$.email',
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
      email: S.String.pipe(FieldKind(FieldKindEnum.Email)),
      org: ref(Org),
    }) {}

    const org = create(Org, { name: 'Org' });
    const person = create(Person, { name: 'John', email: 'john@example.com', org });
    log.info('schema', { org: toJsonSchema(Org), person: toJsonSchema(Person) });
    log.info('objects', { org, person });
    expect(getTypename(org)).to.eq(Org.typename);
    expect(getTypename(person)).to.eq(Person.typename);
  });

  test('dynamic schema definitions with references', async () => {
    const orgSchema = createStoredSchema('example.com/type/Org', '0.1.0');
    setProperty(orgSchema.jsonSchema, 'name', S.String.annotations({ [AST.DescriptionAnnotationId]: 'Org name' }));

    const personSchema = createStoredSchema('example.com/type/Person', '0.1.0');
    setProperty(
      personSchema.jsonSchema,
      'name',
      S.String.annotations({
        [AST.TitleAnnotationId]: 'Name',
        [AST.DescriptionAnnotationId]: 'Full name',
      }),
    );

    setProperty(
      personSchema.jsonSchema,
      'email',
      S.String.pipe(FieldKind(FieldKindEnum.Email)).annotations({ [AST.DescriptionAnnotationId]: 'Primary email' }),
    );

    setProperty(
      personSchema.jsonSchema,
      'org',
      createReferenceAnnotation(orgSchema).annotations({ [AST.DescriptionAnnotationId]: 'Employer' }),
    );

    const personView = create(ViewSchema, {
      schema: personSchema.jsonSchema,
      query: {
        __typename: personSchema.typename,
      },
      fields: [
        {
          path: 'name',
        },
        {
          path: 'email',
        },
        {
          path: 'org',
        },
      ],
    });

    log.info('schema', { org: orgSchema, person: personSchema });
    log.info('view', { person: personView });
  });
});
