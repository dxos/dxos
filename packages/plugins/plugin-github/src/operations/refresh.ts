//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { PullRequest, Repo } from '@dxos/types';

import { GitHubOperation } from '#types';

import { pullRequestChanges } from '../pull-request.ts';
import { fetchPullRequestWithFallback } from './import-pull-request.ts';
import { type GitHubAccess } from './pull-request.ts';

/**
 * How often the space's refresh trigger polls its open pull requests: hourly, at an off-the-hour minute
 * so the fleet of spaces does not land on EDGE's busiest tick, and because every open pull request
 * costs a GitHub request against the connection's rate limit.
 */
export const REFRESH_CRON = '17 * * * *';

/** States GitHub can still move a pull request out of; a closed or merged one is settled. */
const IN_FLIGHT_STATES: readonly PullRequest.State[] = ['open', 'draft'];

/**
 * Re-read one stored pull request from GitHub and write back the fields that changed.
 *
 * Uses the anonymous fallback, so a public pull request still refreshes behind a revoked token.
 * Returns the names of the changed fields.
 */
export const refreshPullRequest = Effect.fn('refreshPullRequest')(function* (
  pullRequest: PullRequest.PullRequest,
  access: GitHubAccess,
) {
  const pull = yield* fetchPullRequestWithFallback(pullRequest, access);
  const changes = pullRequestChanges(pullRequest, pull);
  const updated = Object.keys(changes);
  if (updated.length > 0) {
    Obj.update(pullRequest, (pullRequest) => {
      Object.assign(pullRequest, changes);
    });
  }

  return updated;
});

/** Code-unit order, so every peer and EDGE agree on it regardless of locale. */
const byId = (left: { id: string }, right: { id: string }): number =>
  left.id < right.id ? -1 : left.id > right.id ? 1 : 0;

/** Most pull requests one run refreshes, so a run stays within GitHub's rate limit and EDGE's subrequest budget. */
export const REFRESH_BATCH_SIZE = 20;

/**
 * The slice of `pullRequests` the run in window `window` refreshes: consecutive windows walk the list in
 * id order and wrap, so every pull request is refreshed once every `ceil(count / size)` runs without
 * storing a cursor.
 */
export const selectRefreshBatch = (
  pullRequests: readonly PullRequest.PullRequest[],
  window: number,
  size = REFRESH_BATCH_SIZE,
): PullRequest.PullRequest[] => {
  if (pullRequests.length <= size) {
    return [...pullRequests];
  }
  const ordered = [...pullRequests].sort(byId);
  const start = (window * size) % ordered.length;
  return Array.from({ length: size }, (_, index) => ordered[(start + index) % ordered.length]);
};

/** The space's pull requests GitHub may still change. */
export const queryInFlightPullRequests = () =>
  Database.query(Filter.type(PullRequest.PullRequest)).run.pipe(
    Effect.map((pullRequests) => pullRequests.filter((pullRequest) => IN_FLIGHT_STATES.includes(pullRequest.state))),
    Effect.orDie,
  );

/** `owner/name` of every repository a sync binding targets. */
const boundRepositories = () =>
  Effect.gen(function* () {
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    const names = new Set<string>();
    for (const cursor of cursors) {
      if (Cursor.isExternal(cursor)) {
        const target = yield* Database.load(cursor.spec.target).pipe(Effect.orElseSucceed(() => undefined));
        if (Repo.instanceOf(target)) {
          names.add(Repo.fullName(target));
        }
      }
    }
    return names;
  }).pipe(Effect.orDie);

/** In-flight pull requests in repositories no binding polls; a bound repository's sync covers the rest. */
export const queryUnboundInFlightPullRequests = () =>
  Effect.gen(function* () {
    const bound = yield* boundRepositories();
    const inFlight = yield* queryInFlightPullRequests();
    return inFlight.filter((pullRequest) => !bound.has(`${pullRequest.owner}/${pullRequest.repo}`));
  });

const isRefreshTrigger = (trigger: Trigger.Trigger): boolean =>
  trigger.runnable?.uri === GitHubOperation.RefreshPullRequests.meta.key.toString();

/**
 * Give the space its one pull-request refresh trigger, unless it has one already — including one the
 * user disabled, which stays disabled.
 *
 * Peers that race to create it each add their own, so every caller converges on the same keeper (the
 * lowest id) and removes the rest. The trigger runs on EDGE, so pull requests keep refreshing while no
 * client has the space open.
 */
export const ensureRefreshTrigger = Effect.fn('ensureRefreshTrigger')(function* () {
  const triggers = yield* Database.query(Filter.type(Trigger.Trigger)).run.pipe(Effect.orDie);
  const [keeper, ...duplicates] = triggers.filter(isRefreshTrigger).sort(byId);
  for (const duplicate of duplicates) {
    yield* Database.remove(duplicate);
  }
  if (keeper) {
    return keeper;
  }

  return yield* Database.add(
    Trigger.make({
      enabled: true,
      remote: true,
      spec: Trigger.specTimer(REFRESH_CRON),
      // Statically defined in the registry, so referred to by key rather than copied into the space.
      runnable: Ref.fromURI(GitHubOperation.RefreshPullRequests.meta.key),
      input: {},
    }),
  );
});
