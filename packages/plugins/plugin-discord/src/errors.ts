//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { isErrorResponse, isRatelimited } from '@dxos/discord-client';
import { BaseError } from '@dxos/errors';

/**
 * User-facing / persisted diagnostic string for failures from Discord sync paths.
 */
export const formatDiscordSyncFailure = (error: unknown): string => {
  if (isErrorResponse(error) || isRatelimited(error)) {
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
