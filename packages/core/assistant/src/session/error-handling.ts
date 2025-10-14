//
// Copyright 2025 DXOS.org
//

import { AiError } from '@effect/ai';
import { HttpClientError } from '@effect/platform';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiModelError } from '../errors';

const AnthropicErrorResponse = Schema.Struct({
  type: Schema.Literal('error'),
  error: Schema.Struct({
    type: Schema.String,
    message: Schema.String,
  }),
});

// TODO(dmaretskyi): Needs rework
export const mapAiError = (err: AiError.AiError): Effect.Effect<AiError.AiError> =>
  Effect.gen(function* () {
    const cause = err.cause;
    if (HttpClientError.isHttpClientError(cause) && cause.reason === 'StatusCode') {
      const body = yield* cause.response.json.pipe(
        Effect.flatMap(Schema.decodeUnknown(AnthropicErrorResponse, { exact: false })),
      );

      const parsedCause = new AiModelError({
        message: body.error.message,
        context: { model: 'anthropic', type: body.error.type },
      });
      return AiError.UnknownError.make({
        description: body.error.message,
        module: err.module,
        method: err.method,
        cause: parsedCause,
      });
    }
    return err;
  }).pipe(Effect.catchAll(() => Effect.succeed(err)));
