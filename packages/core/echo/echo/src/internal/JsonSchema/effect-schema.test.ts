//
// Copyright 2024 DXOS.org
//

import * as JSONSchema from 'effect/JsonSchema';
import * as Schema from 'effect/Schema';
import { expect, test } from 'vitest';

import { SchemaAST } from '@dxos/effect';
import { log } from '@dxos/log';

/**
 * Effect 4 returns a `Document` -- root schema plus a shared definitions pool -- instead of one flat
 * object, and targets draft 2020-12. These tests characterise the upstream serializer that DXOS's
 * own encoder builds on, so they assert the document rather than a flattened view of it.
 */
const toJsonSchema = (schema: Schema.Top) => Schema.toJsonSchemaDocument(schema);

test('json-schema annotations for filter refinement get combined', () => {
  const type = Schema.Number.annotate({
    jsonSchema: { foo: 'foo' },
  }).pipe(Schema.check(Schema.makeFilter(() => true, { jsonSchema: { bar: 'bar' } })));

  const jsonSchema = toJsonSchema(type);
  expect(jsonSchema).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    foo: 'foo',
    bar: 'bar',
    type: 'number',
  });
});

test('json-schema annotations on types do not override the default serialization', () => {
  const type = Schema.Number.annotate({
    jsonSchema: { foo: 'foo' },
  });

  const jsonSchema = toJsonSchema(type);
  expect(jsonSchema).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    foo: 'foo',
    type: 'number',
  });
});

// pass
test('number with title and description annotations', () => {
  const number = Schema.Number.annotate({
    title: 'My Title',
    description: 'My Description',
  });

  expect(toJsonSchema(number)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'number',
    title: 'My Title',
    description: 'My Description',
  });
});

// pass
test('date with title and description annotations', () => {
  const date = Schema.Date.annotate({
    title: 'My Title',
    description: 'My Description',
  });

  expect(toJsonSchema(date)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    $defs: {
      DateFromString: {
        description: 'a string to be decoded into a Date',
        type: 'string',
      },
    },
    $ref: '#/$defs/DateFromString',
  });
});

// fail
test('declare', () => {
  class MyType {}
  const type = Schema.declare<MyType>((x) => x instanceof MyType, {
    jsonSchema: {
      type: 'my-type',
    },
  });

  expect(toJsonSchema(type)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'my-type',
  });

  expect(Schema.is(type)(new MyType())).toBe(true);
  expect(Schema.is(type)({})).toBe(false);

  const withAnnotations = type.annotate({
    title: 'My Title',
    description: 'My Description',
  });

  expect(toJsonSchema(withAnnotations)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'my-type',
    title: 'My Title',
    description: 'My Description',
  });
});

// pass
test('declare with refinement', () => {
  class MyType {}
  const type = Schema.declare<MyType>((x) => x instanceof MyType, {
    jsonSchema: {
      type: 'my-type',
    },
  }).pipe(Schema.check(Schema.makeFilter(() => true, { jsonSchema: {} })));

  const named = type.annotate({
    title: 'My Title',
    description: 'My Description',
  });

  expect(toJsonSchema(named)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'my-type',
    title: 'My Title',
    description: 'My Description',
  });
});

test("default title annotations don't get serialized", () => {
  const schema = Schema.String;

  expect(SchemaAST.getTitleAnnotation(schema.ast)).toEqual('string');
  expect(SchemaAST.getDescriptionAnnotation(schema.ast)).toEqual('a string');

  expect(toJsonSchema(schema)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'string',
  });
});

test.skip('ast comparison', () => {
  log.info('ast', {
    default: Schema.String.ast,
    annotated: Schema.String.annotate({ title: 'Custom title', description: 'Custom description' }).ast,
  });
});
