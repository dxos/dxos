//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';
import type * as AiError from 'effect/unstable/ai/AiError';
import type * as Response from 'effect/unstable/ai/Response';
import type * as Tool from 'effect/unstable/ai/Tool';

/**
 * Removes the `tool-call` parts from the stream that contain parsed tool call parameters.
 * The streamed `tool-params-start`, `tool-params-delta`, and `tool-params-end` parts are not
 * affected.
 *
 * A stream that fails because tool call parameters did not parse ends cleanly instead: consumers
 * of this combinator read only the raw delta parts, which have already been emitted by the time
 * the terminal parse failure arrives.
 */
export const withoutToolCallParsing = <Tools extends Record<string, Tool.Any>, E extends AiError.AiError, R>(
  stream: Stream.Stream<Response.StreamPart<Tools>, E, R>,
): Stream.Stream<Response.StreamPart<Tools>, E, R> => {
  return stream.pipe(
    Stream.filter((part) => part.type !== 'tool-call'),
    Stream.catch((err) => (err.reason._tag === 'InvalidOutputError' ? Stream.empty : Stream.fail(err))),
  );
};
