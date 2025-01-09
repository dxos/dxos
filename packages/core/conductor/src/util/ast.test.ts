import { describe, test } from 'vitest';
import { Schema as S } from '@effect/schema';
import { pickProperty } from './ast';

describe('ast', () => {
  const schema = S.Struct(
    {
      foo: S.Number,
    },
    {
      key: S.String,
      value: S.Any,
    },
  );

  test('field', ({ expect }) => {
    const field = pickProperty(schema, 'foo');
    expect(field.ast).toEqual(S.Number.ast);
  });

  test('record', ({ expect }) => {
    const field = pickProperty(schema, 'key');
    expect(field.ast).toEqual(S.Any.ast);
  });

  test('nothing', ({ expect }) => {
    const field = pickProperty(S.Struct({ foo: S.Number }), 'bar' as any);
    expect(field.ast).toEqual(S.Never.ast);
  });
});
