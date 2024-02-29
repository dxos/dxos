//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

export class TestClass {
  field = 'value';

  toJSON() {
    return { field: this.field };
  }
}

const TestNestedSchema = S.mutable(S.struct({ field: S.string }));
export const TestSchema = S.mutable(
  S.partial(
    S.struct({
      string: S.string,
      number: S.number,
      boolean: S.boolean,
      null: S.null,
      undefined: S.undefined,
      numberArray: S.mutable(S.array(S.number)),
      twoDimNumberArray: S.mutable(S.array(S.mutable(S.array(S.number)))),
      object: TestNestedSchema,
      objectArray: S.mutable(S.array(TestNestedSchema)),
      other: S.any,
    }),
  ),
);
export type TestSchema = S.Schema.To<typeof TestSchema>;
export const TestSchemaWithClass = S.extend(
  TestSchema,
  S.mutable(S.struct({ classInstance: S.optional(S.instanceOf(TestClass)) })),
);
export type TestSchemaWithClass = S.Schema.To<typeof TestSchemaWithClass>;
