//
// Copyright 2024 DXOS.org
//

import { ArrayFormatter, Schema as S } from '@effect/schema';
import { Effect, Either } from 'effect';

export type ValidationError = { path: string; message: string };

// TODO(burdon): Validate each field separately.
export const validateSchema = <T>(schema: S.Schema<T>, values: any): ValidationError[] | undefined => {
  const validator = S.decodeUnknownEither(schema, { errors: 'all' });
  const result = validator(values);
  if (Either.isLeft(result)) {
    const errors = Effect.runSync(ArrayFormatter.formatError(result.left));
    return errors.map(({ message, path }) => ({
      message,
      path: path
        .map((segment) => {
          // If segment is a number, wrap in brackets, otherwise return as-is.
          const str = String(segment);
          return /^\d+$/.test(str) ? `[${str}]` : str;
        })
        .join('.'),
    }));
  }

  return undefined;
};
