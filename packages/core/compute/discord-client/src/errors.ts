//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Predicate from 'effect/Predicate';

import { type ErrorResponseBody } from './types';

/**
 * A non-2xx response other than 429.
 *
 * `cause` carries Discord's parsed `{ code, message }` envelope — the only place the API explains
 * *why* a request was refused (50001 "Missing Access" on an unreadable channel, for instance) —
 * and `response.status` the HTTP status.
 */
export class ErrorResponse extends Data.TaggedError('ErrorResponse')<{
  readonly cause: ErrorResponseBody;
  readonly response: { readonly status: number };
}> {}

/** A 429, retained after the client exhausted its retries. `cause.retry_after` is in seconds. */
export class RatelimitedResponse extends Data.TaggedError('RatelimitedResponse')<{
  readonly cause: ErrorResponseBody;
  readonly response: { readonly status: number };
}> {}

/** A transport or body-decode failure — no Discord response to attribute it to. */
export class RequestError extends Data.TaggedError('DiscordRequestError')<{
  readonly cause: unknown;
}> {}

export type DiscordRestError = ErrorResponse | RatelimitedResponse | RequestError;

/**
 * Structural guards rather than `instanceof`.
 *
 * A sync failure is caught after crossing an `Effect.result` boundary and, on the persisted-error
 * path, may have been round-tripped; the `_tag` is the identity that survives that.
 */
const hasResponseFields = (
  error: Record<string, unknown>,
): error is { cause: ErrorResponseBody; response: { status: number } } =>
  Predicate.isObject(error.cause) &&
  Predicate.isObject(error.response) &&
  typeof (error.response as { status?: unknown }).status === 'number';

export const isErrorResponse = (error: unknown): error is ErrorResponse =>
  Predicate.isObject(error) && error._tag === 'ErrorResponse' && hasResponseFields(error);

export const isRatelimited = (error: unknown): error is RatelimitedResponse =>
  Predicate.isObject(error) && error._tag === 'RatelimitedResponse' && hasResponseFields(error);

/** Reads the HTTP status off any error that carries a Discord response. */
export const getStatus = (error: unknown): number | undefined => {
  if (!Predicate.isObject(error) || !Predicate.isObject(error.response)) {
    return undefined;
  }
  const { status } = error.response as { status?: unknown };
  return typeof status === 'number' ? status : undefined;
};

/** Discord's "Missing Access" code, reported on a channel the credential cannot read. */
export const MISSING_ACCESS_CODE = 50001;

export const isMissingAccess = (error: unknown): boolean =>
  (isErrorResponse(error) || isRatelimited(error)) && error.cause.code === MISSING_ACCESS_CODE;
