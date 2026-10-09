//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as HttpClient from 'effect/http/HttpClient';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { PullRequest } from '@dxos/types';

import { GitHubOperation } from '#types';

import { pullRequestChanges } from '../pull-request.ts';
import { fetchPullRequestWithFallback } from './import-pull-request.ts';

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
export const refreshPullRequest = (
  pullRequest: PullRequest.PullRequest,
  token: string,
): Effect.Effect<string[], never, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const pull = yield* fetchPullRequestWithFallback(pullRequest, token);
    const changes = pullRequestChanges(pullRequest, pull);
    const updated = Object.keys(changes);
    if (updated.length > 0) {
      Obj.update(pullRequest, (pullRequest) => {
        Object.assign(pullRequest, changes);
      });
    }

    return updated;
  });

/** The space's pull requests GitHub may still change. */
export const queryInFlightPullRequests = () =>
  Database.query(Filter.type(PullRequest.PullRequest)).run.pipe(
    Effect.map((pullRequests) => pullRequests.filter((pullRequest) => IN_FLIGHT_STATES.includes(pullRequest.state))),
    Effect.orDie,
  );

const isRefreshTrigger = (trigger: Trigger.Trigger): boolean =>
  trigger.runnable?.uri === GitHubOperation.RefreshPullRequests.meta.key.toString();

/**
 * Give the space its pull-request refresh trigger, unless it has one already — including one the user
 * disabled, which stays disabled.
 *
 * The trigger runs on EDGE, so pull requests keep refreshing while no client has the space open.
 */
export const ensureRefreshTrigger = () =>
  Effect.gen(function* () {
    const triggers = yield* Database.query(Filter.type(Trigger.Trigger)).run.pipe(Effect.orDie);
    const existing = triggers.find(isRefreshTrigger);
    if (existing) {
      return existing;
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
