//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';

import { GitHubOperation } from '#types';

import { GitHubApi } from '../services/index.ts';
import { resolvePullRequest } from './pull-request.ts';

const handler: Operation.WithHandler<typeof GitHubOperation.GetPullRequestDiff> =
  GitHubOperation.GetPullRequestDiff.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ pullRequest: ref }) {
        const { pullRequest, credentials } = yield* resolvePullRequest(ref);
        const { owner, repo, number } = pullRequest;
        const [pull, diff] = yield* Effect.all(
          [GitHubApi.fetchPullRequest(owner, repo, number), GitHubApi.fetchPullRequestDiff(owner, repo, number)],
          { concurrency: 2 },
        ).pipe(Effect.provide(credentials));
        return { diff, ...(pull.head?.sha ? { commit: pull.head.sha } : {}) };
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
