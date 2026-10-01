//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { GitHubOperation } from '#types';

import { pullRequestChanges } from '../pull-request.ts';
import { fetchPullRequestWithFallback } from './import-pull-request.ts';
import { githubToken, resolvePullRequest } from './pull-request.ts';

const handler: Operation.WithHandler<typeof GitHubOperation.SyncPullRequest> = GitHubOperation.SyncPullRequest.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ pullRequest: ref }) {
      const { pullRequest, db } = yield* resolvePullRequest(ref);
      const token = yield* githubToken().pipe(Effect.provide(Database.layer(db)));
      // With the anonymous fallback, so a public pull request still refreshes behind a revoked token.
      const pull = yield* fetchPullRequestWithFallback(pullRequest, token);
      const changes = pullRequestChanges(pullRequest, pull);
      const updated = Object.keys(changes);
      if (updated.length > 0) {
        Obj.update(pullRequest, (pullRequest) => {
          Object.assign(pullRequest, changes);
        });
      }

      return { updated };
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
