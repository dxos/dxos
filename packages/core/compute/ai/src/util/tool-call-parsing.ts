//
// Copyright 2026 DXOS.org
//

import type * as AiError from '@effect/ai/AiError';
import * as Response from '@effect/ai/Response';
import type * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import type * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

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
