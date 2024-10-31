//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { describe, test } from 'vitest';

import {
  composeSchema,
  create,
  createEmptySchema,
  dynamicRef,
  effectToJsonSchema,
  ref,
  setProperty,
  type JsonPath,
  TypedObject,
  setAnnotation,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { FieldKind, FieldKindEnum, FieldPath } from './annotations';
import { ViewSchema } from './view';

// TODO(burdon): Add expects.
// TODO(burdon): Move tests to echo-schema?
describe('schema composition', () => {
  test('schema composition', ({ expect }) => {
    class BaseType extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String,
    }) {}

    const OverlaySchema = S.Struct({
      name: S.String,
      email: S.String.pipe(FieldPath('$.email' as JsonPath)).pipe(FieldKind(FieldKindEnum.Email)),
    });

    const baseSchema = effectToJsonSchema(BaseType);
    const overlaySchema = effectToJsonSchema(OverlaySchema);

    const composedSchema = composeSchema(baseSchema, overlaySchema);
    // TODO(burdon): Remove any cast?
    expect((composedSchema as any).properties).toEqual({
      name: {
        type: 'string',
      },
      email: {
        type: 'string',
        $echo: {
          annotations: {
            'dxos.view': { path: '$.email', kind: 'email' },
          },
        },
      },
    });

    log.info('schema', { typeSchemaJson: baseSchema, viewSchema: overlaySchema, composedSchema });
  });

  test('static schema definitions with references', async () => {
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      name: S.String,
    }) {}

    class Person extends TypedObject({ typename: 'example.com/type/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String.pipe(FieldKind(FieldKindEnum.Email)),
      org: ref(Org),
    }) {}

    log.info('schema', { org: effectToJsonSchema(Org), person: effectToJsonSchema(Person) });

    const org = create(Org, { name: 'Org' });
    const person = create(Person, { name: 'John', email: 'john@example.com', org });

    log.info('schema', { org, person });
  });

  test('dynamic schema definitions with references', async () => {
    const orgSchema = createEmptySchema('example.com/type/Org', '0.1.0');

    setProperty(orgSchema.jsonSchema, 'name', S.String.annotations({ [AST.DescriptionAnnotationId]: 'Org name' }));

    log.info('org', { orgSchema });

    const personSchema = createEmptySchema('example.com/type/Person', '0.1.0');

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
      dynamicRef(orgSchema).annotations({ [AST.DescriptionAnnotationId]: 'Employer' }),
    );

    log.info('person', { personSchema });

    const personView = create(ViewSchema, {
      schema: personSchema.jsonSchema,
      // schema: effectToJsonSchema(
      // S.Struct({
      // name: S.String,
      // email: S.String,
      // org: dynamicRef(orgSchema).annotations({ [AST.DescriptionAnnotationId]: 'Employer' }),
      // }),
      // ),
      query: {
        __typename: personSchema.typename,
      },
      fields: [],
    });

    log.info('view', { personView });

    // const composedSchema = composeSchema(
    // JSON.parse(JSON.stringify(personSchema)).jsonSchema,
    // JSON.parse(JSON.stringify(personView)).schema,
    // );

    // log.info('composed', { composedSchema });
  });
});
