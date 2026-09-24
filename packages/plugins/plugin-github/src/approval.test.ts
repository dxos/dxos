//
// Copyright 2026 DXOS.org
//

import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { describe, expect, test } from 'vitest';

import { APPROVAL_MARKER, approvalCommentBody, isApprovalComment, isApprovalRefused } from './approval.ts';

const statusError = (status: number) => {
  const request = HttpClientRequest.post('https://api.github.com/repos/dxos/dxos/pulls/1/reviews');
  return new HttpClientError.HttpClientError({
    reason: new HttpClientError.StatusCodeError({
      request,
      response: HttpClientResponse.fromWeb(request, new Response(null, { status })),
    }),
  });
};

describe('approval fallback', () => {
  test('the comment carries the marker, and the reviewer summary above it', () => {
    expect(isApprovalComment(approvalCommentBody())).toBe(true);
    expect(approvalCommentBody('Looks good.').startsWith('Looks good.')).toBe(true);
    expect(approvalCommentBody('Looks good.').endsWith(APPROVAL_MARKER)).toBe(true);
  });

  test('an ordinary comment is not an approval', () => {
    expect(isApprovalComment('Approved — good to land.')).toBe(false);
  });

  test('only a refusal to review falls back', () => {
    expect(isApprovalRefused(statusError(422))).toBe(true);
    expect(isApprovalRefused(statusError(403))).toBe(true);
    // A rejected credential is the user's to fix and must surface as a failure.
    expect(isApprovalRefused(statusError(401))).toBe(false);
    expect(isApprovalRefused(new Error('offline'))).toBe(false);
  });
});
