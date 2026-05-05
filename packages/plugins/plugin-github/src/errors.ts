//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { BaseError } from '@dxos/errors';

const INTEGRATION_DATABASE_MISSING_MESSAGE = 'No database for integration ref.' as const;

/** Integration ref had no resolvable ECHO database (invoker did not provide `Database.layer`). */
export class IntegrationDatabaseMissingError extends BaseError.extend(
  'IntegrationDatabaseMissingError',
  INTEGRATION_DATABASE_MISSING_MESSAGE,
) {}

/**
 * User-facing / persisted diagnostic string for failures from GitHub sync paths.
 */
export const formatGitHubSyncFailure = (error: unknown): string => {
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
