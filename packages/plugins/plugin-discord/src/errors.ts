//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { BaseError } from '@dxos/errors';

/**
 * Discord returned a non-2xx response. dfx surfaces these as
 * `DiscordRestError<'ErrorResponse', ErrorResponse>` (4xx other than 429) or
 * `DiscordRestError<'RatelimitedResponse', RatelimitedResponse>` (429), matched on `_tag` rather
 * than `instanceof` because the tag is the identity `Effect.catchTag` surfaces.
 */
type DfxErrorResponseShape = {
  readonly _tag: 'ErrorResponse';
  readonly data: { readonly code?: number; readonly message?: string };
  readonly response: { readonly status: number };
};

type DfxRatelimitedResponseShape = {
  readonly _tag: 'RatelimitedResponse';
  readonly data: { readonly code?: number; readonly message?: string; readonly retry_after?: number };
  readonly response: { readonly status: number };
};

/**
 * The decoded Discord body sits on `data`; both it and `response` are validated before claiming the
 * shape so an incomplete error falls through to the generic formatter rather than throwing.
 */
const hasDiscordErrorFields = (
  error: Record<string, unknown>,
): error is { data: { code?: number; message?: string }; response: { status: number } } =>
  Predicate.isObject(error.data) &&
  Predicate.isObject(error.response) &&
  typeof (error.response as { status?: unknown }).status === 'number';

export const isDiscordErrorResponse = (error: unknown): error is DfxErrorResponseShape =>
  Predicate.isObject(error) && error._tag === 'ErrorResponse' && hasDiscordErrorFields(error);

export const isDiscordRatelimited = (error: unknown): error is DfxRatelimitedResponseShape =>
  Predicate.isObject(error) && error._tag === 'RatelimitedResponse' && hasDiscordErrorFields(error);

/** Read the HTTP status from a dfx Discord error if present. */
export const discordErrorStatus = (error: unknown): number | undefined => {
  if (
    Predicate.isObject(error) &&
    Predicate.isObject((error as { response?: unknown }).response) &&
    typeof (error as { response: { status?: unknown } }).response.status === 'number'
  ) {
    return (error as { response: { status: number } }).response.status;
  }
  return undefined;
};

/** The binding names no Discord channel: its cursor carries no `externalId`. */
export class DiscordChannelUnresolvedError extends BaseError.extend(
  'DiscordChannelUnresolvedError',
  'Binding does not name a Discord channel.',
) {}

/** The binding's target is not a Channel, so there is nothing to sync into. */
export class DiscordTargetInvalidError extends BaseError.extend(
  'DiscordTargetInvalidError',
  'Binding target is not a Channel.',
) {}

/**
 * User-facing / persisted diagnostic string for failures from Discord sync paths.
 */
export const formatDiscordSyncFailure = (error: unknown): string => {
  if (isDiscordErrorResponse(error) || isDiscordRatelimited(error)) {
    const { code, message } = error.data;
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
  if (Predicate.isObject(error) && typeof error._tag === 'string') {
    if (error._tag === 'ResponseError' && Predicate.isObject(error.response) && 'status' in error.response) {
      return `HTTP ${error.response.status}`;
    }
    return error._tag;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
