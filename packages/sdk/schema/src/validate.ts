//
// Copyright 2024 DXOS.org
//

import { ArrayFormatter, Schema as S } from '@effect/schema';
import { Effect } from 'effect';

// TODO(ZaymonFC): This error type is anaemic.
export type ValidationError = { path: string; message: string };

export const validateSchema = <T>(schema: S.Schema<T>, data: any): ValidationError[] | undefined => {
  const validator = S.decodeUnknownEither(schema, { errors: 'all' });
  const result = validator(data);

  if (result._tag === 'Left') {
    const errors = Effect.runSync(ArrayFormatter.formatError(result.left));
    // TODO(Zan): Path.join is an assumption...
    return errors.map(({ message, path }) => ({ message, path: path.join('.') }));
  }

  return undefined;
};
