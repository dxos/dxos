//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { TypeInputOptionsAnnotation, getTypeInputOptions } from './SpaceForm.ts';

const OPTIONS = { location: ['database'], kind: ['user'] } as const;

const fieldAst = (schema: Schema.Struct<any>) => schema.ast.propertySignatures[0].type;

describe('getTypeInputOptions', () => {
  test('reads the options a required field declares', ({ expect }) => {
    const schema = Schema.Struct({ typename: Schema.String.pipe(TypeInputOptionsAnnotation.set(OPTIONS)) });
    expect(Option.getOrUndefined(getTypeInputOptions(fieldAst(schema)))).toEqual(OPTIONS);
  });

  test('reads them through Schema.optional', ({ expect }) => {
    const schema = Schema.Struct({
      typename: Schema.String.pipe(TypeInputOptionsAnnotation.set(OPTIONS), Schema.optional),
    });
    expect(Option.getOrUndefined(getTypeInputOptions(fieldAst(schema)))).toEqual(OPTIONS);
  });

  test('finds none on a plain field', ({ expect }) => {
    const schema = Schema.Struct({ typename: Schema.String });
    expect(Option.isNone(getTypeInputOptions(fieldAst(schema)))).toBe(true);
  });
});
