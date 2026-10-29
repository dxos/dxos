//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type * as Credential from '@dxos/compute/Credential';
import { Database, Filter, Obj, type Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Error';
import { type AccessToken, Connection } from '@dxos/link';
import { log } from '@dxos/log';
import { type PullRequest } from '@dxos/types';

import { type GitHubOperation } from '#types';

import { GITHUB_CONNECTOR_IDS } from '../constants.ts';
import { GitHubPullRequestUnstoredError } from '../errors.ts';
import { GitHubApi } from '../services/index.ts';

/**
 * The GitHub connection whose token requests are sent with: the first one holding a token. Shared by
 * the handlers and by the UI that sends the user to reconnect, so both name the same connection.
 */
export const githubConnection = (): Effect.Effect<
  { connection: Connection.Connection; accessToken: AccessToken.AccessToken } | undefined,
  EntityNotFoundError,
  Database.Service
> =>
  Effect.gen(function* () {
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    for (const connection of connections) {
      if (!connection.connectorId || !GITHUB_CONNECTOR_IDS.includes(connection.connectorId)) {
        continue;
      }
      const accessToken = yield* Database.load(Connection.getAccessToken(connection));
      if (accessToken.token) {
        return { connection, accessToken };
      }
    }

    return undefined;
  });

/**
 * How a read reaches GitHub for the space: the token of {@link githubConnection}, empty for anonymous
 * (which reaches any public pull request), and whether the space has a connection at all, since one
 * whose token cannot be resolved is fixed by reconnecting, not connecting.
 */
export type GitHubAccess = { token: string; connected: boolean };

export const githubAccess = (): Effect.Effect<
  GitHubAccess,
  EntityNotFoundError,
  Database.Service | Credential.CredentialsService
> =>
  Effect.flatMap(githubConnection(), (selected) =>
    selected
      ? GitHubApi.resolveToken(selected.accessToken).pipe(
          Effect.map((token): GitHubAccess => ({ token, connected: true })),
          Effect.catchTag('GitHubConnectionUnavailableError', (error) =>
            Effect.sync((): GitHubAccess => {
              log.info('github connection token unavailable; reading anonymously', { error });
              return { token: '', connected: true };
            }),
          ),
        )
      : Effect.succeed<GitHubAccess>({ token: '', connected: false }),
  );

/** {@link githubAccess} as credentials for a read, which goes anonymous when the token cannot be resolved. */
export const githubReadCredentials = () =>
  Effect.map(githubAccess(), ({ token }) => Layer.succeed(GitHubApi.GitHubCredentials, { token }));

/**
 * The token of {@link githubConnection} as credentials for a write, which has no anonymous fallback:
 * one that cannot be resolved fails it, in a way the UI names as the connection to fix.
 */
export const githubWriteCredentials = () =>
  Effect.flatMap(githubConnection(), (selected) =>
    (selected ? GitHubApi.resolveToken(selected.accessToken) : Effect.succeed('')).pipe(
      Effect.map((token) => Layer.succeed(GitHubApi.GitHubCredentials, { token })),
    ),
  );

/**
 * The stored pull request behind an operation's input, and its database.
 *
 * The invoker carries no database resolver, so handlers derive one from the pull request itself; a
 * preview card's in-memory pull request has none and cannot be acted on.
 */
export const resolvePullRequest = (ref: Ref.Ref<PullRequest.PullRequest>) =>
  Effect.gen(function* () {
    const pullRequest = ref.target;
    const db = pullRequest ? Obj.getDatabase(pullRequest) : undefined;
    if (!pullRequest || !db) {
      return yield* Effect.die(new GitHubPullRequestUnstoredError());
    }
    return { pullRequest, db };
  });

// `stale` is a completed run GitHub never re-ran, which branch protection does not count as passing.
const FAILED_CONCLUSIONS = new Set([
  'failure',
  'cancelled',
  'timed_out',
  'action_required',
  'startup_failure',
  'stale',
]);

/** One check run as the article lists it: its outcome folded the way {@link summarizeCheckRuns} counts it. */
export const toCheckRun = (run: GitHubApi.GitHubCheckRun): GitHubOperation.CheckRun => {
  const outcome: GitHubOperation.CheckOutcome =
    run.status !== 'completed'
      ? 'pending'
      : run.conclusion && FAILED_CONCLUSIONS.has(run.conclusion)
        ? 'failure'
        : run.conclusion === 'skipped'
          ? 'skipped'
          : run.conclusion === 'neutral'
            ? 'neutral'
            : 'success';
  const url = run.details_url ?? run.html_url;
  return {
    ...(run.id !== undefined ? { id: run.id } : {}),
    name: run.name,
    outcome,
    ...(run.conclusion ? { conclusion: run.conclusion } : {}),
    ...(url ? { url } : {}),
    ...(run.started_at ? { startedAt: run.started_at } : {}),
    ...(run.completed_at ? { completedAt: run.completed_at } : {}),
  };
};

/** Folds a commit's check runs into one outcome: any failure fails, then any unfinished run is pending. */
export const summarizeCheckRuns = (
  runs: readonly GitHubApi.GitHubCheckRun[],
): { ci: GitHubOperation.CiState; checks: GitHubOperation.CheckCounts } => {
  const checks = { total: runs.length, passed: 0, failed: 0, pending: 0 };
  for (const run of runs) {
    if (run.status !== 'completed') {
      checks.pending++;
    } else if (run.conclusion && FAILED_CONCLUSIONS.has(run.conclusion)) {
      checks.failed++;
    } else {
      checks.passed++;
    }
  }

  const ci: GitHubOperation.CiState =
    checks.total === 0 ? 'none' : checks.failed > 0 ? 'failure' : checks.pending > 0 ? 'pending' : 'success';
  return { ci, checks };
};

/** Review states that set a reviewer's standing verdict; a comment leaves the previous one in place. */
const VERDICT_STATES = new Set(['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED']);

/**
 * Folds a pull request's reviews into where they stand, from each reviewer's latest verdict - the
 * way GitHub reads them: a later approval clears that reviewer's request for changes, and a dismissal
 * withdraws whichever verdict it replaced.
 */
export const summarizeReviews = (
  reviews: readonly GitHubApi.GitHubSubmittedReview[],
): { review: GitHubOperation.ReviewState; approvals: number } => {
  const verdicts = new Map<string, string>();
  for (const review of reviews) {
    const login = review.user?.login;
    if (login && VERDICT_STATES.has(review.state)) {
      verdicts.set(login, review.state);
    }
  }

  const states = [...verdicts.values()];
  const approvals = states.filter((state) => state === 'APPROVED').length;
  const review: GitHubOperation.ReviewState = states.includes('CHANGES_REQUESTED')
    ? 'changes_requested'
    : approvals > 0
      ? 'approved'
      : 'none';
  return { review, approvals };
};
