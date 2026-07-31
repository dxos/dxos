//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { BaseError } from '@dxos/errors';

const INVALID_TRELLO_ACCESS_TOKEN_MESSAGE =
  'Trello access token must be a "<apiKey>:<userToken>" colon-separated string.' as const;

/** Stored `AccessToken.token` is not `"<apiKey>:<userToken>"`. */
export class InvalidTrelloAccessTokenError extends BaseError.extend(
  'InvalidTrelloAccessTokenError',
  INVALID_TRELLO_ACCESS_TOKEN_MESSAGE,
) {}

/**
 * User-facing / persisted diagnostic string for failures from Trello sync paths.
 */
export const formatTrelloSyncFailure = (error: unknown): string => {
  if (InvalidTrelloAccessTokenError.is(error)) {
    return INVALID_TRELLO_ACCESS_TOKEN_MESSAGE;
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
