//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { BaseError } from '@dxos/errors';

/**
 * Discord returned a non-2xx response. dfx surfaces these as
 * `DiscordRestError<'ErrorResponse', ErrorResponse>` (4xx other than 429) or
 * `DiscordRestError<'RatelimitedResponse', RatelimitedResponse>` (429).
 * `cause` carries the parsed Discord body `{ code, message }` and `response`
 * exposes the HTTP status. We pattern-match on `_tag` rather than reaching
 * for `instanceof` because dfx's tag is the stable identity surfaced through
 * `Effect.catchTag`.
 */
type DfxErrorResponseShape = {
  readonly _tag: 'ErrorResponse';
  readonly cause: { readonly code?: number; readonly message?: string };
  readonly response: { readonly status: number };
};

type DfxRatelimitedResponseShape = {
  readonly _tag: 'RatelimitedResponse';
  readonly cause: { readonly code?: number; readonly message?: string; readonly retry_after?: number };
  readonly response: { readonly status: number };
};

/**
 * dfx errors always carry `cause` (the parsed Discord body) and `response`
 * (the HttpClient response). Validate both before claiming the shape so an
 * incomplete `{ _tag: 'ErrorResponse' }` falls through to the generic
 * formatter branch instead of crashing on a missing `error.cause`.
 */
const hasDiscordErrorFields = (
  error: Record<string, unknown>,
): error is { cause: { code?: number; message?: string }; response: { status: number } } =>
  Predicate.isRecord(error.cause) &&
  Predicate.isRecord(error.response) &&
  typeof (error.response as { status?: unknown }).status === 'number';

export const isDiscordErrorResponse = (error: unknown): error is DfxErrorResponseShape =>
  Predicate.isRecord(error) && error._tag === 'ErrorResponse' && hasDiscordErrorFields(error);

export const isDiscordRatelimited = (error: unknown): error is DfxRatelimitedResponseShape =>
  Predicate.isRecord(error) && error._tag === 'RatelimitedResponse' && hasDiscordErrorFields(error);

/** Read the HTTP status from a dfx Discord error if present. */
export const discordErrorStatus = (error: unknown): number | undefined => {
  if (
    Predicate.isRecord(error) &&
    Predicate.isRecord((error as { response?: unknown }).response) &&
    typeof (error as { response: { status?: unknown } }).response.status === 'number'
  ) {
    return (error as { response: { status: number } }).response.status;
  }
  return undefined;
};

/**
 * User-facing / persisted diagnostic string for failures from Discord sync paths.
 */
export const formatDiscordSyncFailure = (error: unknown): string => {
  if (isDiscordErrorResponse(error) || isDiscordRatelimited(error)) {
    const { code, message } = error.cause;
    if (typeof message === 'string' && message.length > 0) {
      return typeof code === 'number' ? `Discord API error ${code}: ${message}` : `Discord API error: ${message}`;
    }
    return typeof code === 'number' ? `Discord API error ${code}` : `Discord API error (HTTP ${error.response.status})`;
  }
  if (SyncDatabaseMissingError.is(error)) {
    return error.message;
  }
  if (error instanceof BaseError) {
    const keys = Object.keys(error.context);
    return keys.length > 0 ? `${error.name}: ${JSON.stringify(error.context)}` : error.name;
  }
  if (Predicate.isRecord(error) && typeof error._tag === 'string') {
    if (error._tag === 'ResponseError' && Predicate.isRecord(error.response) && 'status' in error.response) {
      return `HTTP ${error.response.status}`;
    }
    return error._tag;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
