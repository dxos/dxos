//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { GitHubRepoInaccessibleError } from '../errors.ts';
import { GitHubApi } from '../services/index.ts';
import { fetchPullRequestWithFallback } from './import-pull-request.ts';

const reference = { owner: 'dxos', repo: 'dxos', number: 13188 };

/** The stubs answer without a request, but the fetch signature still carries the client the real one needs. */
const run = <T>(effect: Effect.Effect<T, never, HttpClient.HttpClient>) =>
  EffectEx.runAndForwardErrors(effect.pipe(Effect.provide(FetchHttpClient.layer)));

const pull: GitHubApi.GitHubPull = { id: 1, number: reference.number, title: 'Walkthroughs', state: 'open' };

/** The failure `HttpClient.filterStatusOk` produces for a non-2xx GitHub response. */
const statusError = (status: number) => {
  const request = HttpClientRequest.get('https://api.github.com/repos/dxos/dxos/pulls/13188');
  return new HttpClientError.HttpClientError({
    reason: new HttpClientError.StatusCodeError({
      request,
      response: HttpClientResponse.fromWeb(request, new Response(null, { status })),
    }),
  });
};

/** Answers every authenticated request with `status` and every anonymous one with the pull request. */
const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: string, _repo: string, _number: number) =>
  Effect.gen(function* () {
    const { token } = yield* GitHubApi.GitHubCredentials;
    tokens.push(token);
    if (token !== '') {
      return yield* Effect.fail(statusError(status));
    }
    return pull;
  });

describe('import — token fallback', () => {
  test('a token GitHub rejects is retried anonymously', async ({ expect }) => {
    const tokens: string[] = [];
    const result = await run(fetchPullRequestWithFallback(reference, 'dead-token', fetchRejectingToken(401, tokens)));

    expect(result).toEqual(pull);
    expect(tokens).toEqual(['dead-token', '']);
  });

  test('a token that works is not retried', async ({ expect }) => {
    const tokens: string[] = [];
    const result = await run(
      fetchPullRequestWithFallback(reference, 'live-token', (_owner, _repo, _number) =>
        Effect.gen(function* () {
          tokens.push((yield* GitHubApi.GitHubCredentials).token);
          return pull;
        }),
      ),
    );

    expect(result).toEqual(pull);
    expect(tokens).toEqual(['live-token']);
  });

  test('unauthorized anonymously too reports the repository as inaccessible', async ({ expect }) => {
    const tokens: string[] = [];
    const error = await run(
      fetchPullRequestWithFallback(reference, 'dead-token', (_owner, _repo, _number) =>
        Effect.gen(function* () {
          tokens.push((yield* GitHubApi.GitHubCredentials).token);
          return yield* Effect.fail(statusError(401));
        }),
      ),
    ).then(
      () => undefined,
      (error) => error,
    );

    expect(GitHubRepoInaccessibleError.is(error)).toBe(true);
    expect((error as GitHubRepoInaccessibleError).context).toMatchObject({ ...reference, status: 401 });
    expect(tokens).toEqual(['dead-token', '']);
  });
});
