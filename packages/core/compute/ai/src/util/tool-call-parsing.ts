//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import type * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import type * as AiError from 'effect/unstable/ai/AiError';
import * as Response from 'effect/unstable/ai/Response';
import type * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

/**
 * Removes the `tool-call` parts from the stream that contain parsed tool call parameters.
 * The streamed `tool-params-start`, `tool-params-delta`, and `tool-params-end` parts are not affected.
 * Handles the stream ending prematurely because parsing the tool call parameters failed.
 *
 * Effect 4 folded `MalformedOutput` into `AiError` as an `InvalidOutputError` reason, and the
 * rejected value now travels in the reason's metadata rather than on a nested parse issue.
 */
export const withoutToolCallParising = <Tools extends Record<string, Tool.Any>, E extends AiError.AiError, R>(
  stream: Stream.Stream<Response.StreamPart<Tools>, E, R>,
): Stream.Stream<Response.StreamPart<Tools>, E | AiError.AiError, R> => {
  return stream.pipe(
    Stream.filter((part) => part.type !== 'tool-call'),
    Stream.catch((err) => {
      const actual = (err.reason as { metadata?: Record<string, unknown> }).metadata?.actual;
      if (Array.isArray(actual)) {
        // Assuming the error is always caused by decoding the stream parts.
        const partsEncoded = actual as Response.StreamPartEncoded[];

        return Stream.fromIterableEffect(
          Effect.gen(function* () {
            // Filter out tool calls and try decoding the remaining parts.
            const partsWithoutToolCalls = yield* pipe(
              partsEncoded.filter((part) => part.type !== 'tool-call'),
              Schema.decodeEffect(Schema.Array(Response.StreamPart(Toolkit.empty))),
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
