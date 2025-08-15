import { AiError } from '@effect/ai';
import { HttpClientError } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { AnthropicError } from '../errors';

const AnthropicErrorResponse = Schema.Struct({
  type: Schema.Literal('error'),
  error: Schema.Struct({
    type: Schema.String,
    message: Schema.String,
  }),
});

export const mapAiError = (err: AiError.AiError): Effect.Effect<AiError.AiError> =>
  Effect.gen(function* () {
    const cause = err.cause;
    if (HttpClientError.isHttpClientError(cause) && cause.reason === 'StatusCode') {
      const body = yield* cause.response.json.pipe(
        Effect.flatMap(Schema.decodeUnknown(AnthropicErrorResponse, { exact: false })),
      );

      const parsedCause = new AnthropicError(`${body.error.type}: ${body.error.message}`);
      return new AiError.AiError({
        description: body.error.message,
        module: err.module,
        method: err.method,
        cause: parsedCause,
      });
    }
    return err;
  }).pipe(Effect.catchAll(() => Effect.succeed(err)));
