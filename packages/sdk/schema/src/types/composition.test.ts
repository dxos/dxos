import { Schema as S } from '@effect/schema';
import { ColumnSize, ViewPath, FieldKind, FieldValueType, ViewSchema, type JsonPath } from './types';
import { test } from 'vitest';
import {
  create,
  effectToJsonSchema,
  ref,
  ReferenceAnnotationId,
  StoredSchema,
  TypedObject,
  type JsonSchemaType,
  type ReactiveObject,
  type ReferenceAnnotationValue,
} from '@dxos/echo-schema';
import { composeSchema } from './composition';
import { log } from '@dxos/log';
import { DescriptionAnnotationId } from '@effect/schema/AST';

test.skip('schema composition', ({ expect }) => {
  const TestSchema = S.Struct({
    name: S.String,
    email: S.String.pipe(FieldKind(FieldValueType.Email)),
  });

  const ProjectionSchema = S.Struct({
    name: S.String.pipe(ViewPath('$.name' as JsonPath)).pipe(ColumnSize(50)),
    email: S.String.pipe(ViewPath('$.email' as JsonPath)).pipe(ColumnSize(100)),
  });

  const testSchemaJson = effectToJsonSchema(TestSchema);
  const projectionSchemaJson = effectToJsonSchema(ProjectionSchema);

  const composedSchema = composeSchema(testSchemaJson, projectionSchemaJson);

  expect((composedSchema as any).properties).toEqual({
    name: {
      type: 'string',
      $echo: {
        annotations: { 'dxos.view': { dataSource: '$.name', size: 50 } },
      },
    },
    email: {
      type: 'string',
      $echo: {
        annotations: {
          'dxos.view': { dataSource: '$.email', size: 100 },
          'dxos.schema': { kind: 'email' },
        },
      },
    },
    // manager: {
    //   type: 'object',
    //   properties: {
    //     '/': {
    //       type: 'string',
    //     },
    //   },
    //   $echo: {
    //     kind: 'reference',
    //     referencedType: 'dxn:type:example.com/type/User',
    //   },
    // },
  });
  log.info('schema', { typeSchemaJson: testSchemaJson, projectionSchemaJson, composedSchema });
});

test.skip('scratch', async () => {
  class Org extends TypedObject({ typename: 'example.com/Org', version: '0.1.0' })({
    name: S.String,
  }) {}

  class Person extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
    name: S.String,
    email: S.String.pipe(FieldKind(FieldValueType.Email)),
    org: ref(Org),
  }) {}

  log.info('schema', { org: effectToJsonSchema(Org), person: effectToJsonSchema(Person) });

  const org = create(Org, { name: 'Org' });

  const person = create(Person, { name: 'John', email: 'john@example.com', org });

  log.info('schema', { org, person });
});

const createEmptySchema = (typename: string, version: string): ReactiveObject<StoredSchema> =>
  create(StoredSchema, {
    typename,
    version,
    jsonSchema: effectToJsonSchema(S.Struct({})),
  });

const setProperty = (schema: JsonSchemaType, field: string, type: S.Schema.Any): void => {
  const jsonSchema = effectToJsonSchema(type as S.Schema<any>);
  delete jsonSchema.$schema; // Remove $schema on leaf nodes.
  ((schema as any).properties ??= {})[field] = jsonSchema;
};

const dynamicRef = (obj: StoredSchema): S.Schema.Any =>
  S.Any.annotations({
    [ReferenceAnnotationId]: {
      schemaId: obj.id,
      typename: obj.typename,
      version: obj.version,
    } satisfies ReferenceAnnotationValue,
  });

test('scratch', async () => {
  // empty schema
  const orgSchema = createEmptySchema('example.com/Org', '0.1.0');

  // add name field
  setProperty(orgSchema.jsonSchema, 'name', S.String.annotations({ [DescriptionAnnotationId]: 'Org name' }));

  log.info('org', { orgSchema });

  // empty schema
  const personSchema = createEmptySchema('example.com/Person', '0.1.0');

  // add name field
  setProperty(personSchema.jsonSchema, 'name', S.String.annotations({ [DescriptionAnnotationId]: 'Person name' }));

  // add email field
  setProperty(
    personSchema.jsonSchema,
    'email',
    S.String.pipe(FieldKind(FieldValueType.Email)).annotations({ [DescriptionAnnotationId]: 'Person email' }),
  );

  // add org field
  setProperty(
    personSchema.jsonSchema,
    'org',
    dynamicRef(orgSchema).annotations({ [DescriptionAnnotationId]: 'Person org' }),
  );

  log.info('person', { personSchema });

  const personView = create(ViewSchema, {
    query: {
      __typename: personSchema.typename,
    },
    schema: effectToJsonSchema(
      S.Struct({
        name: S.String.pipe(ViewPath('$.name' as JsonPath)).pipe(ColumnSize(50)),
        email: S.String.pipe(ViewPath('$.email' as JsonPath)).pipe(ColumnSize(100)),
        org: S.Any.pipe(ViewPath('$.org' as JsonPath)),
      }),
    ),
  });

  log.info('view', { personView });
});

/*

TODO:

$echo -> echo
annotations -> annotations
anyOf: ReactiveArray(2) [ { type: 'object' }, { type: 'array' } ], on effectToJsonSchema(S.Struct({}))


*/
