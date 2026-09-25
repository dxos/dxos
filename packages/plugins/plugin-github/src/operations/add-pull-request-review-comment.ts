//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';

import { GitHubOperation } from '#types';

import { GitHubApi } from '../services/index.ts';
import { resolvePullRequest } from './pull-request.ts';

const handler: Operation.WithHandler<typeof GitHubOperation.AddPullRequestReviewComment> =
  GitHubOperation.AddPullRequestReviewComment.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ pullRequest: ref, body, commit, path, line, side }) {
        const { pullRequest, credentials } = yield* resolvePullRequest(ref);
        const comment = yield* GitHubApi.createReviewComment(pullRequest.owner, pullRequest.repo, pullRequest.number, {
          body,
          commit_id: commit,
          path,
          line,
          side,
        }).pipe(Effect.provide(credentials));
        return { commentId: comment.id, url: comment.html_url ?? undefined };
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
