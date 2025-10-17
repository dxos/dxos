//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { pickProperty } from './ast';

describe('ast', () => {
  const schema = Schema.Struct(
    {
      foo: Schema.Number,
    },
    {
      key: Schema.String,
      value: Schema.Any,
    },
  );

  test('field', ({ expect }) => {
    const field = pickProperty(schema, 'foo');
    expect(field.ast).toEqual(Schema.Number.ast);
  });

  test('record', ({ expect }) => {
    const field = pickProperty(schema, 'key');
    expect(field.ast).toEqual(Schema.Any.ast);
  });

  test('nothing', ({ expect }) => {
    const field = pickProperty(Schema.Struct({ foo: Schema.Number }), 'bar' as any);
    expect(field.ast).toEqual(Schema.Never.ast);
  });
});
