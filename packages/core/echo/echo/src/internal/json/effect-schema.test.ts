//
// Copyright 2024 DXOS.org
//

import { JSONSchema, Option, Schema, SchemaAST } from 'effect';
import { expect, test } from 'vitest';

import { log } from '@dxos/log';

test('json-schema annotations for filter refinement get combined', () => {
  const type = Schema.Number.annotations({
    jsonSchema: { foo: 'foo' },
  }).pipe(Schema.filter(() => true, { jsonSchema: { bar: 'bar' } }));

  const jsonSchema = JSONSchema.make(type);
  expect(jsonSchema).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    foo: 'foo',
    bar: 'bar',
    type: 'number',
  });
});

test('json-schema annotations on types do not override the default serialization', () => {
  const type = Schema.Number.annotations({
    jsonSchema: { foo: 'foo' },
  });

  const jsonSchema = JSONSchema.make(type);
  expect(jsonSchema).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    foo: 'foo',
    type: 'number',
  });
});

// pass
test('number with title and description annotations', () => {
  const number = Schema.Number.annotations({
    title: 'My Title',
    description: 'My Description',
  });

  expect(JSONSchema.make(number)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'number',
    title: 'My Title',
    description: 'My Description',
  });
});

// pass
test('date with title and description annotations', () => {
  const date = Schema.Date.annotations({
    title: 'My Title',
    description: 'My Description',
  });

  expect(JSONSchema.make(date)).toEqual({
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

  expect(JSONSchema.make(type)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'my-type',
  });

  expect(type.pipe(Schema.is)(new MyType())).toBe(true);
  expect(type.pipe(Schema.is)({})).toBe(false);

  const withAnnotations = type.annotations({
    title: 'My Title',
    description: 'My Description',
  });

  expect(JSONSchema.make(withAnnotations)).toEqual({
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
  }).pipe(Schema.filter(() => true, { jsonSchema: {} }));

  const named = type.annotations({
    title: 'My Title',
    description: 'My Description',
  });

  expect(JSONSchema.make(named)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'my-type',
    title: 'My Title',
    description: 'My Description',
  });
});

test("default title annotations don't get serialized", () => {
  const schema = Schema.String;

  expect(SchemaAST.getTitleAnnotation(schema.ast).pipe(Option.getOrUndefined)).toEqual('string');
  expect(SchemaAST.getDescriptionAnnotation(schema.ast).pipe(Option.getOrUndefined)).toEqual('a string');

  expect(JSONSchema.make(schema)).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'string',
  });
});

test.skip('ast comparison', () => {
  log.info('ast', {
    default: Schema.String.ast,
    annotated: Schema.String.annotations({ title: 'Custom title', description: 'Custom description' }).ast,
  });
});
