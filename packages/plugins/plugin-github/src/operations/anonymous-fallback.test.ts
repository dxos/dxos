//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { withAnonymousFallback } from './pull-request.ts';

/** The failure `HttpClient.filterStatusOk` produces for a non-2xx GitHub response. */
const statusError = (status: number) => {
  const request = HttpClientRequest.get('https://api.github.com/repos/dxos/dxos/pulls/13297');
  return new HttpClientError.HttpClientError({
    reason: new HttpClientError.StatusCodeError({
      request,
      response: HttpClientResponse.fromWeb(request, new Response(null, { status })),
    }),
  });
};

/** Answers every authenticated read with `status` and every anonymous one with the diff. */
const readRejectingToken = (status: number, tokens: string[]) => (token: string) =>
  Effect.gen(function* () {
    tokens.push(token);
    if (token !== '') {
      return yield* Effect.fail(statusError(status));
    }
    return 'diff --git a/a.ts b/a.ts';
  });

describe('withAnonymousFallback', () => {
  // A GitHub App token reaches only its own installations, so a public repository outside them
  // answers 404 — which is why the walkthrough's reads could fail on a pull request the same space
  // had already imported anonymously (DX-1307).
  for (const status of [401, 403, 404]) {
    test(`a ${status} the token could have caused is retried anonymously`, async ({ expect }) => {
      const tokens: string[] = [];
      const result = await EffectEx.runAndForwardErrors(
        withAnonymousFallback('scoped-token', readRejectingToken(status, tokens)),
      );

      expect(result).toEqual('diff --git a/a.ts b/a.ts');
      expect(tokens).toEqual(['scoped-token', '']);
    });
  }

  test('a status the token cannot explain is not retried', async ({ expect }) => {
    const tokens: string[] = [];
    const exit = await EffectEx.runPromise(
      Effect.exit(withAnonymousFallback('live-token', readRejectingToken(500, tokens))),
    );

    expect(exit._tag).toEqual('Failure');
    expect(tokens).toEqual(['live-token']);
  });

  test('a token that works is not retried', async ({ expect }) => {
    const tokens: string[] = [];
    const result = await EffectEx.runAndForwardErrors(
      withAnonymousFallback('live-token', (token) => {
        tokens.push(token);
        return Effect.succeed('ok');
      }),
    );

    expect(result).toEqual('ok');
    expect(tokens).toEqual(['live-token']);
  });

  test('an already anonymous read is not retried against itself', async ({ expect }) => {
    const tokens: string[] = [];
    const exit = await EffectEx.runPromise(
      Effect.exit(
        withAnonymousFallback('', (token) => {
          tokens.push(token);
          return Effect.fail(statusError(404));
        }),
      ),
    );

    // The empty token IS the anonymous read, so a second one would only repeat the same failure.
    expect(exit._tag).toEqual('Failure');
    expect(tokens).toEqual(['']);
  });

  test('the rejected status is reported to the caller', async ({ expect }) => {
    const seen: (number | undefined)[] = [];
    await EffectEx.runAndForwardErrors(
      withAnonymousFallback('scoped-token', readRejectingToken(404, []), (status) => seen.push(status)),
    );

    expect(seen).toEqual([404]);
  });
});
