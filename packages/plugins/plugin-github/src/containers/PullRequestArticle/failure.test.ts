//
// Copyright 2026 DXOS.org
//

import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { describe, test } from 'vitest';

import { pullRequestFailureKey } from './failure.ts';

const FALLBACK = 'walkthrough-failed.title';

/** The failure `HttpClient.filterStatusOk` produces for a non-2xx GitHub response. */
const statusError = (status: number) => {
  const request = HttpClientRequest.get('https://api.github.com/repos/dxos/dxos/pulls/13272');
  return new HttpClientError.HttpClientError({
    reason: new HttpClientError.StatusCodeError({
      request,
      response: HttpClientResponse.fromWeb(request, new Response(null, { status })),
    }),
  });
};

describe('pullRequestFailureKey', () => {
  // A revoked or expired connection token is the only one of these the user can act on, and it
  // reached the toast as the raw `StatusCode: non 2xx status code (401 GET …)` (DX-1301).
  test('a rejected credential names the reconnect message', ({ expect }) => {
    expect(pullRequestFailureKey(statusError(401), FALLBACK)).toBe('github-token-rejected.title');
  });

  test('any other status keeps the caller-supplied message', ({ expect }) => {
    expect(pullRequestFailureKey(statusError(404), FALLBACK)).toBe(FALLBACK);
    expect(pullRequestFailureKey(statusError(500), FALLBACK)).toBe(FALLBACK);
  });

  // A transport or decode failure carries no status at all, so it must not be read as an auth error.
  test('a non-HTTP failure keeps the caller-supplied message', ({ expect }) => {
    expect(pullRequestFailureKey(new Error('boom'), FALLBACK)).toBe(FALLBACK);
    expect(pullRequestFailureKey(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
