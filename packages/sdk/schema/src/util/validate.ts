//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as ParseResult from 'effect/ParseResult';
import * as Schema from 'effect/Schema';

export type ValidationError = { path: string; message: string };

// TODO(burdon): Factor out (dxos/effect?)
// TODO(burdon): Validate each field separately.
export const validateSchema = <T>(schema: Schema.Schema<T>, values: any): ValidationError[] | undefined => {
  const validator = Schema.decodeUnknownEither(schema, { errors: 'all' });
  const result = validator(values);
  if (Either.isLeft(result)) {
    const errors = Effect.runSync(ParseResult.ArrayFormatter.formatError(result.left));
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
};

export const adaptValidationMessage = <T extends string | undefined | null = string | undefined | null>(
  message?: T,
): T => (message?.endsWith('is missing') ? 'Required field' : message) as T;
