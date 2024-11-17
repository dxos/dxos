//
// Copyright 2024 DXOS.org
//

import { AST, ArrayFormatter } from '@effect/schema';
import { Either, Option } from 'effect';
import { describe, test } from 'vitest';

import { S } from '@dxos/echo-schema';

import { type PropertyKey } from './properties';

describe('validate', () => {
  test('clamp', ({ expect }) => {
    const TestSchema = S.Number.pipe(S.clamp(-180, 180));
    const decoder = S.decodeUnknownOption(TestSchema);
    expect(decoder(200).pipe(Option.getOrUndefined)).to.eq(180);
    expect(decoder(-300).pipe(Option.getOrUndefined)).to.eq(-180);
  });

  test('error', ({ expect }) => {
    const TestSchema = S.Number.pipe(S.multipleOf(0.01));
    const decoder = S.validateEither(TestSchema, { errors: 'first' });

    {
      const value = decoder(0.01);
      expect(Either.isLeft(value)).to.be.false;
    }

    // https://effect.website/docs/schema/error-formatters/#customizing-the-output
    {
      const value = decoder(0.001);
      expect(Either.isLeft(value)).to.be.true;
      if (Either.isLeft(value)) {
        const [{ message }] = ArrayFormatter.formatErrorSync(value.left);
        expect(message).to.eq('Expected a number divisible by 0.01, actual 0.001');
      }
    }
  });

  test('Schema to/from AST', ({ expect }) => {
    const TestSchema = S.Struct({
      name: S.String.pipe(S.pattern(/^\w+$/)),
    }).pipe(S.mutable);

    type TestType = S.Schema.Type<typeof TestSchema>;

    // Convert to/from AST.
    const s1: S.Schema<TestType> = TestSchema;
    expect(AST.isTypeLiteral(s1.ast)).to.be.true;
    const s2 = S.make(s1.ast);
    expect(s1.ast.toJSON()).to.deep.eq(s2.ast.toJSON());

    const obj: TestType = {
      name: 'DXOS',
    };

    // Validate each field.
    for (const prop of AST.getPropertySignatures(TestSchema.ast)) {
      const name = prop.name.toString() as PropertyKey<TestType>;
      const schema = S.make(prop.type);
      const decoder = S.validateEither(schema, { errors: 'first' });
      const value = obj[name];
      const result = decoder(value);
      expect(Either.isLeft(result)).to.be.false;
    }
  });
});
