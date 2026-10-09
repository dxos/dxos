//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

import { GitHubOperation } from '#types';

import { githubToken } from './pull-request.ts';
import { queryInFlightPullRequests, refreshPullRequest } from './refresh.ts';

/** Bounded so a space with many open pull requests does not burst GitHub's secondary rate limit. */
const REFRESH_CONCURRENCY = 2;

const handler: Operation.WithHandler<typeof GitHubOperation.RefreshPullRequests> =
  GitHubOperation.RefreshPullRequests.pipe(
    Operation.withHandler(
      Effect.fn(function* () {
        const pullRequests = yield* queryInFlightPullRequests();
        if (pullRequests.length === 0) {
          return { checked: 0, updated: 0, failed: 0 };
        }

        const token = yield* githubToken();
        const results = yield* Effect.forEach(
          pullRequests,
          (pullRequest) =>
            // One deleted or unreachable pull request must not fail the run: EDGE disables a trigger
            // after repeated failures, which would stop refreshing every other one.
            refreshPullRequest(pullRequest, token).pipe(
              Effect.map((updated) => (updated.length > 0 ? 'updated' : 'unchanged')),
              Effect.catchDefect((cause) =>
                Effect.sync(() => {
                  log.warn('pull request refresh failed', {
                    owner: pullRequest.owner,
                    repo: pullRequest.repo,
                    number: pullRequest.number,
                    cause,
                  });
                  return 'failed' as const;
                }),
              ),
            ),
          { concurrency: REFRESH_CONCURRENCY },
        );

        return {
          checked: pullRequests.length,
          updated: results.filter((result) => result === 'updated').length,
          failed: results.filter((result) => result === 'failed').length,
        };
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
