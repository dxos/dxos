//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClaudeAgentApiError } from '../errors';
import { isRetryable } from './client';

describe('retry predicate', () => {
  test('transport, throttling and server failures are retried', ({ expect }) => {
    expect(isRetryable(new ClaudeAgentApiError(0, 'offline'))).toBe(true);
    expect(isRetryable(new ClaudeAgentApiError(429, 'slow down'))).toBe(true);
    expect(isRetryable(new ClaudeAgentApiError(503, 'unavailable'))).toBe(true);
  });

  test('a rejected request is not retried', ({ expect }) => {
    // Retrying the caller's own bad request only spends the operation's time budget.
    expect(isRetryable(new ClaudeAgentApiError(400, 'invalid model'))).toBe(false);
    expect(isRetryable(new ClaudeAgentApiError(401, 'bad key'))).toBe(false);
    expect(isRetryable(new ClaudeAgentApiError(404, 'no such session'))).toBe(false);
  });
});
