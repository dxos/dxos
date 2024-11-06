//
// Copyright 2024 DXOS.org
//

import { JSONSchema, Schema as S } from '@effect/schema';
import { expect, test } from 'vitest';

test('json-schema annotations for filter refinement get combined', () => {
  const type = S.Number.annotations({
    jsonSchema: { foo: 'foo' },
  }).pipe(S.filter(() => true, { jsonSchema: { bar: 'bar' } }));

  const jsonSchema = JSONSchema.make(type);
  expect(jsonSchema).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    foo: 'foo',
    bar: 'bar',
  });
});

test('json-schema annotations on types overrides the default serialization', () => {
  const type = S.Number.annotations({
    jsonSchema: { foo: 'foo' },
  });

  const jsonSchema = JSONSchema.make(type);
  expect(jsonSchema).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    foo: 'foo',
  });
});
