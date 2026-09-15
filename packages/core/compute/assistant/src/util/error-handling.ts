//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as AiError from 'effect/unstable/ai/AiError';

import { AiModelError } from './errors.ts';

const AnthropicErrorResponse = Schema.Struct({
  type: Schema.Literal('error'),
  error: Schema.Struct({
    type: Schema.String,
    message: Schema.String,
  }),
});

// TODO(dmaretskyi): Needs rework.
export const mapAiError = (err: AiError.AiError): Effect.Effect<AiError.AiError> =>
  Effect.gen(function* () {
    const cause = err.reason;
    if (cause._tag === 'UnknownError' && cause.http?.body !== undefined) {
      const body = yield* Effect.succeed(JSON.parse(cause.http.body)).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(AnthropicErrorResponse)),
      );

      const parsedCause = new AiModelError({
        message: body.error.message,
        context: { model: 'anthropic', type: body.error.type },
      });

      return new AiError.AiError({
        module: err.module,
        method: err.method,
        reason: new AiError.UnknownError({
          description: body.error.message,
          metadata: { type: body.error.type, cause: String(parsedCause) },
        }),
      });
    }
    return err;
  }).pipe(Effect.catch(() => Effect.succeed(err)));
