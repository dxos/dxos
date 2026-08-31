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
 * A stream that fails because tool call parameters did not parse ends cleanly instead — as an
 * `InvalidOutputError` failure or, depending on the provider, a raw `SyntaxError` defect — since
 * the raw delta parts consumers read have all been emitted by then.
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

const isToolCallParseFailure = (cause: Cause.Cause<unknown>): boolean =>
  // `reasons` is flat, so a cause combining an unrelated failure must still propagate in full.
  cause.reasons.length > 0 &&
  cause.reasons.every((reason) =>
    reason._tag === 'Fail'
      ? isToolParamsError(reason.error)
      : reason._tag === 'Die' && reason.defect instanceof SyntaxError,
  );

// Providers report unparseable tool params as `InvalidOutputError` or `ToolParameterValidationError`.
const isToolParamsError = (error: unknown): boolean =>
  Predicate.hasProperty(error, 'reason') &&
  (Predicate.isTagged(error.reason, 'InvalidOutputError') ||
    Predicate.isTagged(error.reason, 'ToolParameterValidationError'));
