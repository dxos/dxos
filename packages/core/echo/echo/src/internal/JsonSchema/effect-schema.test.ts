//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { expect, test } from 'vitest';

import { SchemaAST } from '@dxos/effect';
import { log } from '@dxos/log';

/**
 * Characterises the upstream Effect serializer that ECHO's own encoder builds on.
 *
 * Effect 4 changed three things these tests depend on:
 * - generation returns a `Document` (root schema plus a shared definitions pool) targeting draft
 *   2020-12, rather than one flat draft-07 object;
 * - custom annotations are no longer merged from a `jsonSchema` annotation -- the keys are annotated
 *   directly and opted in per key at generation time;
 * - a check's keywords are nested under `allOf` instead of being merged into the node.
 */
const toJsonSchema = (schema: Schema.Top, keys: ReadonlyArray<string> = []) =>
  Schema.toJsonSchemaDocument(schema, { includeAnnotationKey: (key) => keys.includes(key) }).schema;

test('custom annotation keys are emitted when opted in', () => {
  const type = Schema.String.annotate({ foo: 'foo' });

  expect(toJsonSchema(type, ['foo'])).toEqual({ type: 'string', foo: 'foo' });
  // Not opted in: upstream keeps its own annotations on the same record, so keys are excluded by
  // default rather than leaked into the output.
  expect(toJsonSchema(type)).toEqual({ type: 'string' });
});

test('a check contributes its keywords under allOf', () => {
  const type = Schema.String.check(Schema.isMinLength(3));

  expect(toJsonSchema(type)).toEqual({
    type: 'string',
    allOf: [{ minLength: 3 }],
  });
});

test('string with title and description annotations', () => {
  const value = Schema.String.annotate({
    title: 'My Title',
    description: 'My Description',
  });

  // Standard JSON Schema keys are always included, with no opt-in needed.
  expect(toJsonSchema(value)).toEqual({
    type: 'string',
    title: 'My Title',
    description: 'My Description',
  });
});

test('a transformed schema serializes its encoded side', () => {
  const document = Schema.toJsonSchemaDocument(Schema.Date);

  // `Schema.Date` decodes from a string, and generation describes the wire form.
  expect(document.schema).toMatchObject({ type: 'string' });
  expect(document.dialect).toEqual('draft-2020-12');
});

test('declare', () => {
  class MyType {}
  const type = Schema.declare<MyType>((x) => x instanceof MyType);

  expect(Schema.is(type)(new MyType())).toBe(true);
  expect(Schema.is(type)({})).toBe(false);

  // Declarations carry no JSON Schema representation in v4; generation emits nothing for them,
  // which is why ECHO's reference schema puts its keys on a structural encoded side instead.
  expect(toJsonSchema(type)).toEqual({});
});

test('annotations on a declaration do not reach the generated schema', () => {
  class MyType {}
  const type = Schema.declare<MyType>((x) => x instanceof MyType).annotate({
    title: 'My Title',
    description: 'My Description',
  });

  expect(toJsonSchema(type)).toEqual({});
});

test('primitives carry no default title or description', () => {
  const schema = Schema.String;

  // v3 attached `'string'` / `'a string'` defaults that had to be filtered before serializing.
  // v4 attaches none, so nothing needs excluding.
  expect(SchemaAST.getTitleAnnotation(schema.ast)).toBeUndefined();
  expect(SchemaAST.getDescriptionAnnotation(schema.ast)).toBeUndefined();

  expect(toJsonSchema(schema)).toEqual({ type: 'string' });
});

test.skip('ast comparison', () => {
  log.info('ast', {
    default: Schema.String.ast,
    annotated: Schema.String.annotate({ title: 'Custom title', description: 'Custom description' }).ast,
  });
});
