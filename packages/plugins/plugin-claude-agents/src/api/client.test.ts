//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClaudeAgentApiError } from '../errors';
import { isRetryable } from './client';

describe('retry predicate', () => {
  test('a GET retries transport, throttling and server failures', ({ expect }) => {
    expect(isRetryable('GET', new ClaudeAgentApiError(0, 'offline'))).toBe(true);
    expect(isRetryable('GET', new ClaudeAgentApiError(429, 'slow down'))).toBe(true);
    expect(isRetryable('GET', new ClaudeAgentApiError(503, 'unavailable'))).toBe(true);
  });

  test('a POST retries only where the server says it did not act', ({ expect }) => {
    // A lost response to a POST is indistinguishable from one never sent, so retrying a transport
    // or server failure could create the session, vault or credential a second time.
    expect(isRetryable('POST', new ClaudeAgentApiError(429, 'slow down'))).toBe(true);
    expect(isRetryable('POST', new ClaudeAgentApiError(0, 'offline'))).toBe(false);
    expect(isRetryable('POST', new ClaudeAgentApiError(503, 'unavailable'))).toBe(false);
  });

  test('a rejected request is not retried', ({ expect }) => {
    // Retrying the caller's own bad request only spends the operation's time budget.
    for (const method of ['GET', 'POST'] as const) {
      expect(isRetryable(method, new ClaudeAgentApiError(400, 'invalid model'))).toBe(false);
      expect(isRetryable(method, new ClaudeAgentApiError(401, 'bad key'))).toBe(false);
      expect(isRetryable(method, new ClaudeAgentApiError(404, 'no such session'))).toBe(false);
    }
  });
});
