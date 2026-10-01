//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Filter, Obj, type Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';
import { type PullRequest } from '@dxos/types';

import { type GitHubOperation } from '#types';

import { GITHUB_PROVIDER_ID } from '../constants.ts';
import { GitHubPullRequestUnstoredError } from '../errors.ts';
import { GitHubApi } from '../services/index.ts';

/**
 * The GitHub connection whose token requests are sent with: the first one holding a token. Shared by
 * the handlers and by the UI that sends the user to reconnect, so both name the same connection.
 */
export const githubConnection = () =>
  Effect.gen(function* () {
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    for (const connection of connections) {
      if (connection.connectorId !== GITHUB_PROVIDER_ID) {
        continue;
      }
      const accessToken = yield* Database.load(connection.accessToken);
      if (accessToken.token) {
        return { connection, token: accessToken.token };
      }
    }

    return undefined;
  });

/**
 * The token of {@link githubConnection}, or empty for anonymous — which reaches any public pull
 * request, and is the only option in a space that has not connected GitHub.
 */
export const githubToken = () => githubConnection().pipe(Effect.map((selected) => selected?.token ?? ''));

/**
 * The stored pull request behind an operation's input and credentials for its space.
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
    const token = yield* githubToken().pipe(Effect.provide(Database.layer(db)));
    return { pullRequest, db, credentials: Layer.succeed(GitHubApi.GitHubCredentials, { token }) };
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
 * Folds a pull request's reviews into where they stand, from each reviewer's latest verdict — the
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
