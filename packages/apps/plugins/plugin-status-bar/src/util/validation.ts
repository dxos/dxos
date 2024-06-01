//
// Copyright 2024 DXOS.org
//
import { ArrayFormatter } from '@effect/schema';

import { S } from '@dxos/echo-schema';
import { Effect } from 'effect';

export type ValidationError = { path: string; message: string };

export const validate = <T>(schema: S.Schema<T>, data: any): ValidationError[] | undefined => {
  const validator = S.decodeUnknownEither(schema, { errors: 'all' });
  const result = validator(data);

  if (result._tag === 'Left') {
    const errors = Effect.runSync(ArrayFormatter.formatError(result.left));
    // TODO(Zan): Path.join is an assumption...
    return errors.map(({ message, path }) => ({ message, path: path.join('.') }));
  }

  return undefined;
};
