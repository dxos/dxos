//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';

import { GitHubOperation } from '#types';

import { GitHubApi } from '../services/index.ts';
import { resolvePullRequest } from './pull-request.ts';

const handler: Operation.WithHandler<typeof GitHubOperation.AddPullRequestComment> =
  GitHubOperation.AddPullRequestComment.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ pullRequest: ref, body }) {
        const { pullRequest, credentials } = yield* resolvePullRequest(ref);
        const comment = yield* GitHubApi.createIssueComment(
          pullRequest.owner,
          pullRequest.repo,
          pullRequest.number,
          body,
        ).pipe(Effect.provide(credentials));
        return { commentId: comment.id, url: comment.html_url ?? undefined };
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
