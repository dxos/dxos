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

/** Credentials for one GitHub read; empty is the anonymous request a space with no connection makes. */
export const credentialsFor = (token: string) => Layer.succeed(GitHubApi.GitHubCredentials, { token });

/**
 * Statuses that say nothing about what an anonymous reader can see, because the credential itself
 * could have caused them.
 *
 * 404 is the load-bearing one. GitHub answers 404 rather than 403 wherever a credential lacks
 * access, so as not to confirm what it cannot show, and a GitHub App user-to-server token — what
 * this connector holds — reaches only the repositories the App is installed on. A public repository
 * the App was never installed on therefore reads as absent. (A fine-grained PAT would not behave
 * this way: those carry read access to every public repository regardless of their selection.)
 */
export const MAY_REFLECT_TOKEN_SCOPE = new Set([401, 403, 404]);

/**
 * Runs a GitHub read as the space's connection, retrying it anonymously whenever the token is what
 * stood in the way.
 *
 * A public pull request must never fail because of a credential, and every read on the way to one
 * has to honour that — not just the first. Three separate conditions make a reachable pull request
 * look unreachable: a revoked token (401), a suspended or SSO-blocked one (403), and a repository
 * outside the App installation the token belongs to (404). The anonymous retry, which is the same
 * request a space with no connection would make, resolves all three; the cost is one extra request
 * on a pull request that genuinely does not exist.
 *
 * `onTokenRejected` reports the authenticated attempt's status, so a caller that fails anyway can
 * tell a rejected credential from a resource no one can reach.
 */
export const withAnonymousFallback = <A, E, R>(
  token: string,
  read: (token: string) => Effect.Effect<A, E, R>,
  onTokenRejected: (status: number | undefined) => void = () => {},
): Effect.Effect<A, E, R> =>
  // Suspended so each run starts clean, rather than sharing the first run's decision.
  Effect.suspend(() =>
    read(token).pipe(
      Effect.catchIf(
        (error) => {
          const status = GitHubApi.responseStatus(error);
          return token !== '' && status !== undefined && MAY_REFLECT_TOKEN_SCOPE.has(status);
        },
        (error) => {
          onTokenRejected(GitHubApi.responseStatus(error));
          return read('');
        },
      ),
    ),
  );

/**
 * The first GitHub connection token in the space, or empty for anonymous — which reaches any public
 * pull request, and is the only option in a space that has not connected GitHub.
 */
export const githubToken = () =>
  Effect.gen(function* () {
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    for (const connection of connections) {
      if (connection.connectorId !== GITHUB_PROVIDER_ID) {
        continue;
      }
      const accessToken = yield* Database.load(connection.accessToken);
      if (accessToken.token) {
        return accessToken.token;
      }
    }

    return '';
  });

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
