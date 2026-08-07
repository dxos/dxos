//
// Copyright 2024 DXOS.org
//

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import * as SchemaIssue from 'effect/SchemaIssue';

export type ValidationError = { path: string; message: string };

/**
 * Effect 4 replaced `ParseResult.ArrayFormatter` with the Standard Schema formatter, which flattens
 * the issue tree into `{ message, path }` entries — the same shape this already produced.
 */
const formatIssue = SchemaIssue.makeFormatterStandardSchemaV1();

export const validateSchema = <T>(schema: Schema.Codec<T, any>, values: any): ValidationError[] | undefined => {
  const validator = Schema.decodeUnknownResult(schema, { errors: 'all', onExcessProperty: 'preserve' });
  const result = validator(values);
  if (Result.isFailure(result)) {
    return formatIssue(result.failure.issue).issues.map(({ message, path }) => {
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
        path: (path ?? [])
          .map((segment) => {
            // Standard Schema allows either a bare key or a `{ key }` wrapper.
            const str = String(typeof segment === 'object' ? segment.key : segment);
            // If segment is a number, wrap in brackets, otherwise return as-is.
            return /^\d+$/.test(str) ? `[${str}]` : str;
          })
          .join('.'),
      };
    });
  }
};
