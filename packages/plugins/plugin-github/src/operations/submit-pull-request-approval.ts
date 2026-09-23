//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';

import { GitHubOperation } from '#types';

import { approvalCommentBody, isApprovalRefused } from '../approval.ts';
import { GitHubApi } from '../services/index.ts';
import { resolvePullRequest } from './pull-request.ts';

const handler: Operation.WithHandler<typeof GitHubOperation.SubmitPullRequestApproval> =
  GitHubOperation.SubmitPullRequestApproval.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ pullRequest: ref, body }) {
        const { pullRequest, credentials } = yield* resolvePullRequest(ref);
        const { owner, repo, number } = pullRequest;
        const review = yield* GitHubApi.approvePullRequest(owner, repo, number, body).pipe(
          Effect.provide(credentials),
          Effect.asSome,
          // Only a refusal to review becomes a comment; every other failure stays a failure.
          Effect.catchIf(isApprovalRefused, () => Effect.succeedNone),
        );
        if (Option.isSome(review)) {
          return { reviewId: review.value.id, commented: false };
        }

        const comment = yield* GitHubApi.createIssueComment(owner, repo, number, approvalCommentBody(body)).pipe(
          Effect.provide(credentials),
        );
        return { commentId: comment.id, url: comment.html_url ?? undefined, commented: true };
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
