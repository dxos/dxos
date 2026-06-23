//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { BaseError } from '@dxos/errors';

const SLACK_API_ERROR_MESSAGE = 'Slack API returned an error.' as const;

const SYNC_DATABASE_MISSING_MESSAGE = 'No database for connection/binding ref.' as const;

/**
 * Slack returned `{ ok: false, error: '<code>' }`.
 *
 * Slack reports failures in the response body rather than via HTTP status, so
 * the HTTP layer's retry-on-5xx logic never sees these. Surfacing them as a
 * typed BaseError lets `formatSlackSyncFailure` keep the user-facing string
 * stable and lets callers `.is()` for known auth-revoked cases.
 */
export class SlackApiError extends BaseError.extend('SlackApiError', SLACK_API_ERROR_MESSAGE) {}

/** Connection/binding ref had no resolvable ECHO database (invoker did not provide `Database.layer`). */
export class SyncDatabaseMissingError extends BaseError.extend(
  'SyncDatabaseMissingError',
  SYNC_DATABASE_MISSING_MESSAGE,
) {}

/**
 * User-facing / persisted diagnostic string for failures from Slack sync paths.
 */
export const formatSlackSyncFailure = (error: unknown): string => {
  if (SlackApiError.is(error)) {
    const code = (error.context as { code?: unknown }).code;
    return typeof code === 'string' ? `Slack API error: ${code}` : SLACK_API_ERROR_MESSAGE;
  }
  if (SyncDatabaseMissingError.is(error)) {
    return SYNC_DATABASE_MISSING_MESSAGE;
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
