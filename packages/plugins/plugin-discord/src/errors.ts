//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { BaseError } from '@dxos/errors';

const DISCORD_API_ERROR_MESSAGE = 'Discord API returned an error.' as const;

const INTEGRATION_DATABASE_MISSING_MESSAGE = 'No database for integration ref.' as const;

/**
 * Discord returned a non-2xx response with a JSON body carrying `{ code, message }`.
 *
 * Surfaced as a typed BaseError so `formatDiscordSyncFailure` can produce a
 * stable user-facing string and callers can `.is()` for known auth-revoked
 * cases (e.g. `code: 0` from 401 unauthorized).
 */
export class DiscordApiError extends BaseError.extend('DiscordApiError', DISCORD_API_ERROR_MESSAGE) {}

/** Integration ref had no resolvable ECHO database (invoker did not provide `Database.layer`). */
export class IntegrationDatabaseMissingError extends BaseError.extend(
  'IntegrationDatabaseMissingError',
  INTEGRATION_DATABASE_MISSING_MESSAGE,
) {}

/**
 * User-facing / persisted diagnostic string for failures from Discord sync paths.
 */
export const formatDiscordSyncFailure = (error: unknown): string => {
  if (DiscordApiError.is(error)) {
    const context = error.context as { code?: unknown; message?: unknown };
    if (typeof context.message === 'string' && context.message.length > 0) {
      return typeof context.code === 'number'
        ? `Discord API error ${context.code}: ${context.message}`
        : `Discord API error: ${context.message}`;
    }
    return typeof context.code === 'number' ? `Discord API error ${context.code}` : DISCORD_API_ERROR_MESSAGE;
  }
  if (IntegrationDatabaseMissingError.is(error)) {
    return INTEGRATION_DATABASE_MISSING_MESSAGE;
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
