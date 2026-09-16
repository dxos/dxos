//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Ref } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { PullRequest } from '@dxos/types';

import { GitHubOperation } from '#types';

import { GitHubPullRequestReferenceError } from '../errors.ts';
import { parsePullRequestReference } from '../github-link.ts';
import { toPullRequestProps } from '../pull-request.ts';
import { GitHubApi } from '../services/index.ts';
import { githubToken } from './pull-request.ts';

/**
 * Import a pull request the user named, as the space's GitHub connection or anonymously.
 *
 * The object is filed through `SpaceOperation.AddObject` rather than added directly: an imported
 * pull request is something the user went looking for, so it belongs where they can find it again.
 */
const handler: Operation.WithHandler<typeof GitHubOperation.ImportPullRequest> = GitHubOperation.ImportPullRequest.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ reference }) {
      const parsed = parsePullRequestReference(reference);
      if (!parsed) {
        return yield* Effect.die(new GitHubPullRequestReferenceError({ context: { reference } }));
      }

      const { owner, repo, number } = parsed;
      const [existing] = yield* Database.query(Filter.type(PullRequest.PullRequest, { owner, repo, number })).run.pipe(
        Effect.orDie,
      );
      if (existing) {
        return { pullRequest: Ref.make(existing), imported: false };
      }

      const credentials = Layer.succeed(GitHubApi.GitHubCredentials, { token: yield* githubToken() });
      const pull = yield* GitHubApi.fetchPullRequest(owner, repo, number).pipe(
        Effect.provide(credentials),
        Effect.orDie,
      );

      const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
        object: PullRequest.make(toPullRequestProps(parsed, pull)),
      });
      // `AddObject` answers with what it filed, typed as any object; the narrowing is what makes the
      // returned ref a pull request's rather than a cast.
      if (!PullRequest.instanceOf(object)) {
        return yield* Effect.die(new GitHubPullRequestReferenceError({ context: { reference } }));
      }

      return { pullRequest: Ref.make(object), imported: true };
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
