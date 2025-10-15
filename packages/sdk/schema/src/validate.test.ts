//
// Copyright 2024 DXOS.org
//

import * as Either from 'effect/Either';
import * as Option from 'effect/Option';
import * as ParseResult from 'effect/ParseResult';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, test } from 'vitest';

import { type PropertyKey } from '@dxos/echo/internal';

describe('validate', () => {
  test('clamp', ({ expect }) => {
    const TestSchema = Schema.Number.pipe(Schema.clamp(-180, 180));
    const decoder = Schema.decodeUnknownOption(TestSchema);
    expect(decoder(200).pipe(Option.getOrUndefined)).to.eq(180);
    expect(decoder(-300).pipe(Option.getOrUndefined)).to.eq(-180);
  });

  test('error', ({ expect }) => {
    const TestSchema = Schema.Number.pipe(Schema.multipleOf(0.01));
    const decoder = Schema.validateEither(TestSchema, { errors: 'first' });

    {
      const value = decoder(0.01);
      expect(Either.isLeft(value)).to.be.false;
    }

    // https://effect.website/docs/schema/error-formatters/#customizing-the-output
    {
      const value = decoder(0.001);
      expect(Either.isLeft(value)).to.be.true;
      if (Either.isLeft(value)) {
        const [{ message }] = ParseResult.ArrayFormatter.formatErrorSync(value.left);
        expect(message).to.eq('Expected a number divisible by 0.01, actual 0.001');
      }
    }
  });

  test('Schema to/from AST', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.String.pipe(Schema.pattern(/^\w+$/)),
    }).pipe(Schema.mutable);

    type TestType = Schema.Schema.Type<typeof TestSchema>;

    // Convert to/from AST.
    const s1: Schema.Schema<TestType> = TestSchema;
    expect(SchemaAST.isTypeLiteral(s1.ast)).to.be.true;
    const s2 = Schema.make(s1.ast);
    expect(s1.ast.toJSON()).to.deep.eq(s2.ast.toJSON());

    const obj: TestType = {
      name: 'DXOS',
    };

    // Validate each field.
    for (const prop of SchemaAST.getPropertySignatures(TestSchema.ast)) {
      const name = prop.name.toString() as PropertyKey<TestType>;
      const schema = Schema.make(prop.type);
      const decoder = Schema.validateEither(schema, { errors: 'first' });
      const value = obj[name];
      const result = decoder(value);
      expect(Either.isLeft(result)).to.be.false;
    }
  });
});
