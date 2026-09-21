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

import { GitHubPullRequestReferenceError, GitHubRepoInaccessibleError } from '../errors.ts';
import { type PullRequestReference, parsePullRequestReference } from '../github-link.ts';
import { toPullRequestProps } from '../pull-request.ts';
import { GitHubApi } from '../services/index.ts';
import { githubToken } from './pull-request.ts';

/**
 * The pull request as the space's GitHub connection, falling back to an anonymous read when GitHub
 * rejects the stored token.
 *
 * A connection whose token has expired or been revoked answers 401 for every repository, public
 * ones included, so without the fallback one dead credential makes every import fail. The retry is
 * the same request a space with no connection would make.
 *
 * `fetch` is injected so the fallback can be exercised without an HTTP client.
 */
export const fetchPullRequestWithFallback = (
  { owner, repo, number }: PullRequestReference,
  token: string,
  fetch: (
    owner: string,
    repo: string,
    number: number,
  ) => GitHubApi.GitHubEffect<GitHubApi.GitHubPull> = GitHubApi.fetchPullRequest,
) =>
  // Suspended so each run starts with its own `tokenRejected`, which the fallback sets as it runs.
  Effect.suspend(() => {
    const fetchAs = (token: string) =>
      fetch(owner, repo, number).pipe(Effect.provide(Layer.succeed(GitHubApi.GitHubCredentials, { token })));

    // GitHub rejected the credential itself rather than the repository, which is the one failure the
    // user fixes by reconnecting rather than by asking for access.
    let tokenRejected = false;

    return fetchAs(token).pipe(
      Effect.catchIf(
        (error) => token !== '' && GitHubApi.responseStatus(error) === 401,
        () => {
          tokenRejected = true;
          return fetchAs('');
        },
      ),
      // Out of reach anonymously too (GitHub answers 404 for a private repository seen without
      // credentials): a typed failure lets the dialog name the connection rather than the reference.
      Effect.catchIf(
        (error) => {
          const status = GitHubApi.responseStatus(error);
          return status === 401 || status === 403 || status === 404;
        },
        (error) =>
          Effect.die(
            new GitHubRepoInaccessibleError({
              context: {
                owner,
                repo,
                number,
                status: GitHubApi.responseStatus(error),
                connected: token !== '',
                tokenRejected,
              },
            }),
          ),
      ),
      Effect.orDie,
    );
  });

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

      const pull = yield* fetchPullRequestWithFallback(parsed, yield* githubToken());

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
