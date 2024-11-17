//
// Copyright 2024 DXOS.org
//

import { ArrayFormatter } from '@effect/schema';
import { Either, Option } from 'effect';
import { describe, test } from 'vitest';

import { S } from '@dxos/echo-schema';

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

    {
      const value = decoder(0.001);
      expect(Either.isLeft(value)).to.be.true;
      if (Either.isLeft(value)) {
        const [{ message }] = ArrayFormatter.formatErrorSync(value.left);
        expect(message).to.eq('Expected a number divisible by 0.01, actual 0.001');
      }
    }
  });
});
