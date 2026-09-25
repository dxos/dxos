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
        const [before, diff, after] = yield* Effect.all(
          [
            GitHubApi.fetchPullRequest(owner, repo, number),
            GitHubApi.fetchPullRequestDiff(owner, repo, number),
            GitHubApi.fetchPullRequest(owner, repo, number),
          ],
          { concurrency: 1 },
        ).pipe(Effect.provide(credentials));
        // A push between the reads would pair the diff with another commit's line numbers, so the
        // commit is only reported when the head held still across the diff.
        const commit = before.head?.sha;
        return { diff, ...(commit && commit === after.head?.sha ? { commit } : {}) };
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
