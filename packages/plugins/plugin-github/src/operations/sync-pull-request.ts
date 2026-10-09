//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { log } from '@dxos/log';

import { GitHubOperation } from '#types';

import { githubToken, resolvePullRequest } from './pull-request.ts';
import { ensureRefreshTrigger, refreshPullRequest } from './refresh.ts';

const handler: Operation.WithHandler<typeof GitHubOperation.SyncPullRequest> = GitHubOperation.SyncPullRequest.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ pullRequest: ref }) {
      const { pullRequest, db } = yield* resolvePullRequest(ref);
      const token = yield* githubToken().pipe(Effect.provide(Database.layer(db)));
      const updated = yield* refreshPullRequest(pullRequest, token);
      // Spaces that imported pull requests before the scheduled refresh existed get it on next open.
      yield* ensureRefreshTrigger().pipe(
        Effect.provide(Database.layer(db)),
        // The refresh already succeeded; the schedule is retried on the next open.
        Effect.catchDefect((defect) => Effect.sync(() => log.warn('refresh trigger setup failed', { defect }))),
      );
      return { updated };
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
