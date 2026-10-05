//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { BaseError } from '@dxos/errors';

const SLACK_API_ERROR_MESSAGE = 'Slack API returned an error.' as const;

/**
 * Slack returned `{ ok: false, error: '<code>' }`.
 *
 * Slack reports failures in the response body rather than via HTTP status, so
 * the HTTP layer's retry-on-5xx logic never sees these. Surfacing them as a
 * typed BaseError lets `formatSlackSyncFailure` keep the user-facing string
 * stable and lets callers `.is()` for known auth-revoked cases.
 */
export class SlackApiError extends BaseError.extend('SlackApiError', SLACK_API_ERROR_MESSAGE) {}

/**
 * User-facing / persisted diagnostic string for failures from Slack sync paths.
 */
export const formatSlackSyncFailure = (error: unknown): string => {
  if (SlackApiError.is(error)) {
    const code = (error.context as { code?: unknown }).code;
    return typeof code === 'string' ? `Slack API error: ${code}` : SLACK_API_ERROR_MESSAGE;
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

/**
 * A Slack-backed channel could not do what it was asked: the config is missing or invalid, the token
 * is unusable, or Slack refused. The message is a reason a person can act on.
 */
export class SlackChannelError extends BaseError.extend('SlackChannelError', 'Slack channel request failed.') {}

/** Turns a Slack failure into a reason the agent can relay to a person. */
export const slackFailureReason = (error: unknown): string => {
  const code = SlackApiError.is(error) ? error.context.code : undefined;
  switch (code) {
    case 'missing_scope':
      return 'The Slack token lacks the scope to post (chat:write or im:write); reconnect Slack to grant it.';
    case 'not_in_channel':
      return 'The Slack bot is not a member of that conversation; invite it to the channel first.';
    case 'channel_not_found':
      return 'Slack cannot find that conversation, or the token cannot see it.';
    case 'invalid_auth':
    case 'not_authed':
    case 'token_revoked':
    case 'account_inactive':
      return 'Slack rejected the token; reconnect Slack.';
    default:
      return formatSlackSyncFailure(error);
  }
};

/** The binding's Channel is on neither the Slack backend nor the feed backend it can be upgraded from. */
export class SlackChannelTargetError extends BaseError.extend(
  'SlackChannelTargetError',
  'The bound channel is not a Slack channel.',
) {}
