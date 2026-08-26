//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Predicate from 'effect/Predicate';
import * as Stream from 'effect/Stream';
import type * as AiError from 'effect/unstable/ai/AiError';
import type * as Response from 'effect/unstable/ai/Response';
import type * as Tool from 'effect/unstable/ai/Tool';

import { log } from '@dxos/log';

/**
 * Removes the `tool-call` parts from the stream that contain parsed tool call parameters.
 * The streamed `tool-params-start`, `tool-params-delta`, and `tool-params-end` parts are not
 * affected.
 *
 * A stream that fails because tool call parameters did not parse ends cleanly instead: consumers
 * of this combinator read only the raw delta parts, which have already been emitted by the time
 * the terminal parse failure arrives. The failure arrives either in the error channel (as an
 * `InvalidOutputError`) or, depending on the provider, as a raw `SyntaxError` defect — both end
 * the stream, so the turn can complete and the model can be told its arguments were malformed.
 */
export const withoutToolCallParsing = <Tools extends Record<string, Tool.Any>, E extends AiError.AiError, R>(
  stream: Stream.Stream<Response.StreamPart<Tools>, E, R>,
): Stream.Stream<Response.StreamPart<Tools>, E, R> => {
  return stream.pipe(
    Stream.filter((part) => part.type !== 'tool-call'),
    Stream.catchCause((cause: Cause.Cause<E>): Stream.Stream<Response.StreamPart<Tools>, E, R> => {
      if (isToolCallParseFailure(cause)) {
        log.warn('tool call parameters did not parse', { error: Cause.pretty(cause) });
        return Stream.empty;
      }
      return Stream.failCause(cause);
    }),
  );
};

/**
 * A malformed-arguments failure is recoverable (the model is re-prompted with the tool error);
 * any other failure must propagate.
 */
const isToolCallParseFailure = (cause: Cause.Cause<unknown>): boolean =>
  cause.reasons.some((reason) =>
    reason._tag === 'Fail'
      ? isInvalidOutputError(reason.error)
      : reason._tag === 'Die' && reason.defect instanceof SyntaxError,
  );

const isInvalidOutputError = (error: unknown): boolean =>
  Predicate.hasProperty(error, 'reason') && Predicate.isTagged(error.reason, 'InvalidOutputError');
