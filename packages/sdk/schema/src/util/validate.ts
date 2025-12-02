//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as ParseResult from 'effect/ParseResult';
import * as Schema from 'effect/Schema';

export type ValidationError = { path: string; message: string };

export const validateSchema = <T>(schema: Schema.Schema<T>, values: any): ValidationError[] | undefined => {
  const validator = Schema.decodeUnknownEither(schema, { errors: 'all', onExcessProperty: 'preserve' });
  const result = validator(values);
  if (Either.isLeft(result)) {
    const errors = Effect.runSync(ParseResult.ArrayFormatter.formatError(result.left));
    return errors.map(({ message, path }) => {
      // TODO(burdon): Better way to patch messages? (use translations?)
      if (message === 'is missing') {
        message = 'Required field';
      }
      const idx = message.indexOf(', actual');
      if (idx !== -1) {
        message = message.substring(0, idx);
      }

      return {
        message,
        path: path
          .map((segment) => {
            // If segment is a number, wrap in brackets, otherwise return as-is.
            const str = String(segment);
            return /^\d+$/.test(str) ? `[${str}]` : str;
          })
          .join('.'),
      };
    });
  }
};
