//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { BaseError } from '@dxos/errors';

/** The binding names no repository: no `externalId` and no GitHub foreign key on the target. */
export class GitHubRepoUnresolvedError extends BaseError.extend(
  'GitHubRepoUnresolvedError',
  'Binding does not name a GitHub repository.',
) {}

/** The connection's token cannot see the repository the binding names (un-shared or revoked). */
export class GitHubRepoInaccessibleError extends BaseError.extend(
  'GitHubRepoInaccessibleError',
  'Repository is not accessible to the connection token.',
) {}

/** The local Project could not be re-resolved after its upsert. */
export class GitHubProjectMissingError extends BaseError.extend(
  'GitHubProjectMissingError',
  'Local project missing after upsert.',
) {}

/**
 * User-facing / persisted diagnostic string for failures from GitHub sync paths.
 */
export const formatGitHubSyncFailure = (error: unknown): string => {
  if (error instanceof BaseError) {
    const keys = Object.keys(error.context);
    return keys.length > 0 ? `${error.name}: ${JSON.stringify(error.context)}` : error.name;
  }
  if (Predicate.isObject(error) && typeof error._tag === 'string') {
    if (
      error._tag === 'ResponseError' &&
      Predicate.isObject(error.response) &&
      typeof error.response.status === 'number'
    ) {
      return `HTTP ${error.response.status}`;
    }
    return error._tag;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
