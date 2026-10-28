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

/** The space has a GitHub connection whose token cannot be read, e.g. an App EDGE no longer mints for. */
export class GitHubConnectionUnavailableError extends BaseError.extend(
  'GitHubConnectionUnavailableError',
  'GitHub connection has no usable token.',
) {}

/** Carries status 401, which connection UIs read as a connection to reauthenticate. */
export const connectionUnavailable = (cause?: unknown) =>
  new GitHubConnectionUnavailableError({ context: { status: 401 }, cause });

/** The pull request is not stored: a preview card mints one in memory, and it has no database. */
export class GitHubPullRequestUnstoredError extends BaseError.extend(
  'GitHubPullRequestUnstoredError',
  'Pull request is not stored in a space.',
) {}

/** The text a user typed names no pull request: neither a github.com URL nor `owner/repo#123`. */
export class GitHubPullRequestReferenceError extends BaseError.extend(
  'GitHubPullRequestReferenceError',
  'Not a pull request reference.',
) {}

/** A branch moved between reading its tip and updating it: the ref update was not a fast-forward. */
/** A file marker names an object the space no longer holds. */
export class GitHubFileObjectMissingError extends BaseError.extend(
  'GitHubFileObjectMissingError',
  'The object a synced file is bound to is gone.',
) {}

export class GitHubRefMovedError extends BaseError.extend(
  'GitHubRefMovedError',
  'The branch moved after it was read; pull again and retry.',
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
