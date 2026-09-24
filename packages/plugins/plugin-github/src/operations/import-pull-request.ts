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
 * Statuses that may report the token's reach rather than the repository's absence, and so are worth
 * a second, anonymous attempt.
 *
 * 404 is the load-bearing one. GitHub answers 404 rather than 403 wherever a credential lacks access,
 * so as not to confirm what it cannot show, and a GitHub App user-to-server token — what this
 * connector holds — reaches only the repositories the App is installed on. A public repository the
 * App was never installed on therefore reads as absent. (A fine-grained PAT would not behave this
 * way: those carry read access to every public repository regardless of their selection.)
 *
 * Whatever produced it, the rule is the same: a status that a credential could have caused says
 * nothing about what an anonymous reader can see, and only the anonymous request settles it.
 */
const MAY_REFLECT_TOKEN_SCOPE = new Set([401, 403, 404]);

/**
 * The pull request as the space's GitHub connection, falling back to an anonymous read whenever the
 * stored token is what stood in the way.
 *
 * A public pull request must never fail because of a credential. Three separate conditions make one
 * look unreachable — a revoked token (401), a suspended or SSO-blocked one (403), and a repository
 * outside the App installation the token belongs to (404) — and the anonymous retry, which is the
 * same request a space with no connection would make, resolves all three. The cost is one extra
 * request on a pull request that genuinely does not exist.
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
  // Suspended so each run starts with its own `tokenStatus`, which the fallback sets as it runs.
  Effect.suspend(() => {
    const fetchAs = (token: string) =>
      fetch(owner, repo, number).pipe(Effect.provide(Layer.succeed(GitHubApi.GitHubCredentials, { token })));

    // What the authenticated attempt answered, kept so a rejected credential (401) can be told from a
    // repository the credential simply does not reach (403/404) once the retry has also failed.
    let tokenStatus: number | undefined;

    return fetchAs(token).pipe(
      Effect.catchIf(
        (error) => {
          const status = GitHubApi.responseStatus(error);
          return token !== '' && status !== undefined && MAY_REFLECT_TOKEN_SCOPE.has(status);
        },
        (error) => {
          tokenStatus = GitHubApi.responseStatus(error);
          return fetchAs('');
        },
      ),
      // Out of reach anonymously too (GitHub answers 404 for a private repository seen without
      // credentials): a typed failure lets the dialog name the connection rather than the reference.
      Effect.catchIf(
        (error) => {
          const status = GitHubApi.responseStatus(error);
          return status !== undefined && MAY_REFLECT_TOKEN_SCOPE.has(status);
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
                tokenStatus,
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
