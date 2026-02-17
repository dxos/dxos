import { Effect, type Record } from 'effect';
import * as Stream from 'effect/Stream';
import * as Response from '@effect/ai/Response';
import type * as Tool from '@effect/ai/Tool';
import { Toolkit, type AiError } from '@effect/ai';
import { Chunk } from 'effect';
import { pipe } from 'effect';
import { Schema } from 'effect';

/**
 * Removes the `tool-call` parts from the stream that contain parsed tool call parameters.
 * The streamed `tool-params-start`, `tool-params-delta`, and `tool-params-end` parts are not affected.
 * Handles the stream ending prematurely due to a `MalformedOutput` error when parsing the tool call parameters.
 */
export const withoutToolCallParising = <Tools extends Record<string, Tool.Any>, E extends AiError.AiError, R>(
  stream: Stream.Stream<Response.StreamPart<Tools>, E | AiError.MalformedOutput, R>,
): Stream.Stream<Response.StreamPart<Tools>, E | AiError.AiError, R> => {
  return stream.pipe(
    Stream.filter((part) => part.type !== 'tool-call'),
    Stream.catchTag('MalformedOutput', (err) => {
      const actual = (err.cause as any)?.issue?.actual;
      if (Chunk.isChunk(actual)) {
        // Assuming the error is always caused by decoding the stream parts.
        const partsEncoded = Chunk.toArray(actual) as Response.StreamPartEncoded[];

        return Stream.fromIterableEffect(
          Effect.gen(function* () {
            // Filter out tool calls and try decoding the remaining parts.
            const partsWithoutToolCalls = yield* pipe(
              partsEncoded.filter((part) => part.type !== 'tool-call'),
              Schema.decode(Schema.Array(Response.StreamPart(Toolkit.empty))),
              Effect.orDie,
            );
            // Emit the remaining parts and close the stream without error.
            return partsWithoutToolCalls;
          }),
        );
      }

      return Stream.fail(err);
    }),
  );
};
