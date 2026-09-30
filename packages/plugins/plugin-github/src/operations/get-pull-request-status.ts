//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { type PullRequest } from '@dxos/types';

import { GitHubOperation } from '#types';

import { GitHubApi } from '../services/index.ts';
import { resolvePullRequest, summarizeCheckRuns, toCheckRun } from './pull-request.ts';

const toState = (pull: GitHubApi.GitHubPull): PullRequest.State =>
  pull.merged || pull.merged_at ? 'merged' : pull.draft ? 'draft' : pull.state === 'closed' ? 'closed' : 'open';

const handler: Operation.WithHandler<typeof GitHubOperation.GetPullRequestStatus> =
  GitHubOperation.GetPullRequestStatus.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ pullRequest: ref }) {
        const { pullRequest, credentials } = yield* resolvePullRequest(ref);
        const { owner, repo, number } = pullRequest;
        const pull = yield* GitHubApi.fetchPullRequest(owner, repo, number).pipe(Effect.provide(credentials));
        const commit = pull.head?.sha;
        const runs = commit
          ? yield* GitHubApi.fetchCheckRuns(owner, repo, commit).pipe(Effect.provide(credentials))
          : [];
        return {
          state: toState(pull),
          title: pull.title,
          commit,
          ...(pull.body ? { body: pull.body } : {}),
          ...summarizeCheckRuns(runs),
          runs: runs.map(toCheckRun),
        };
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
