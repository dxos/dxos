//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import * as ConnectorSync from '@dxos/app-toolkit/ConnectorSync';
import { BaseError, messageOf } from '@dxos/errors';
import { EdgeCallFailedError } from '@dxos/protocols';

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
  if (ConnectorSync.DatabaseMissingError.is(error)) {
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

/**
 * A Discord-backed channel could not do what it was asked: the config is missing or invalid, the
 * token is unusable, or Discord refused. The message is a reason a person can act on.
 */
export class DiscordChannelError extends BaseError.extend('DiscordChannelError', 'Discord channel request failed.') {}

/**
 * EDGE refused a bot request for this caller (HTTP 401 or 403): access the caller lacks rather than an outage, so a
 * UI shows it as a state, not a failure. The EDGE failure is the `cause`.
 */
export class DiscordBotAccessError extends BaseError.extend(
  'DiscordBotAccessError',
  'You are not authorised to manage this Discord bot from this space.',
) {}

/** What a failed EDGE bot request means, by HTTP status, since an unhandled EDGE failure carries only the code. */
const BOT_FAILURE_MESSAGES: Record<number, string> = {
  401: 'EDGE could not verify your identity.',
  403: 'You are not authorised to manage this Discord bot from this space.',
  404: 'EDGE does not know this Discord bot.',
  429: 'Too many requests to the Discord bot; try again shortly.',
  500: 'The Discord bot host on EDGE failed.',
  502: 'EDGE could not reach Discord.',
  503: 'The Discord bot host on EDGE is unavailable; try again shortly.',
  504: 'EDGE timed out reaching Discord.',
};

/** Statuses EDGE answers deliberately with a reason of its own (a bad request, a conflict, Discord's refusal). */
const EDGE_REASON_STATUSES = new Set([400, 409, 502]);

/**
 * Maps a failed EDGE bot request to a typed error a person can read: 401/403 as {@link DiscordBotAccessError}, any
 * other as {@link DiscordChannelError}. The raw failure stays on `cause`.
 */
export const toBotRequestError = (cause: unknown): DiscordChannelError | DiscordBotAccessError => {
  const failure = cause instanceof EdgeCallFailedError ? cause : undefined;
  const status = failure?.status;
  if (status === 401 || status === 403) {
    return new DiscordBotAccessError({ message: BOT_FAILURE_MESSAGES[status], cause });
  }
  if (failure === undefined || status === undefined) {
    return new DiscordChannelError({ message: 'Could not reach the Discord bot on EDGE.', cause });
  }
  // An unhandled EDGE failure's message is only the code; the body EDGE sent with it is decoded onto its `cause`.
  // A message that only restates the code (`HTTP code 502: .`) is transport noise, not EDGE's reason.
  const ownMessage = /^HTTP code \d+/.test(failure.message) ? undefined : failure.message;
  const reason = EDGE_REASON_STATUSES.has(status) ? messageOf(failure.cause) || ownMessage || undefined : undefined;
  return new DiscordChannelError({
    message: reason ?? BOT_FAILURE_MESSAGES[status] ?? `The Discord bot request failed (HTTP ${status}).`,
    cause,
  });
};

/** The messages along an error's cause chain below its own, for a secondary detail line under a readable message. */
export const errorDetail = (error: unknown): string | undefined => {
  const top = messageOf(error);
  const messages: string[] = [];
  let current = error instanceof Error ? error.cause : undefined;
  // Bounded, since a cause chain rebuilt from the wire is not guaranteed acyclic.
  for (let depth = 0; current !== undefined && current !== null && depth < 5; depth++) {
    const message = messageOf(current);
    if (message && message !== top && !messages.includes(message)) {
      messages.push(message);
    }
    current = current instanceof Error ? current.cause : undefined;
  }
  return messages.length > 0 ? messages.join(' — ') : undefined;
};
