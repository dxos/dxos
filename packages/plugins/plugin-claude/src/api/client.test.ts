//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, test, vi } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { ClaudeAgentApiError } from '../errors';
import { isRetryable, listEvents } from './client';

const proxyFetchLegacy = vi.hoisted(() => vi.fn());
vi.mock('@dxos/edge-client', () => ({ proxyFetchLegacy }));

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

  test('a 403 retries on either method', ({ expect }) => {
    // The edge proxy rejects intermittently with 403, before the control plane has acted.
    for (const method of ['GET', 'POST'] as const) {
      expect(isRetryable(method, new ClaudeAgentApiError(403, 'Request not allowed'))).toBe(true);
    }
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

describe('listEvents', () => {
  beforeEach(() => proxyFetchLegacy.mockReset());

  const page = {
    data: [
      { type: 'agent.message', content: [{ type: 'text', text: 'newest' }] },
      { type: 'user.message', content: [{ type: 'text', text: 'oldest' }] },
    ],
  };

  test('reads the last events by default and returns them chronologically', async ({ expect }) => {
    respondWith(page);
    const result = await EffectEx.runPromise(listEvents('key', 'sess_1', 2));
    expect(String(proxyFetchLegacy.mock.calls[0][0])).toContain('/v1/sessions/sess_1/events?limit=2&order=desc');
    expect(result.data?.map((event) => event.content?.[0]?.text)).toEqual(['oldest', 'newest']);
  });

  test('order: first reads the opening events, unreversed', async ({ expect }) => {
    respondWith(page);
    const result = await EffectEx.runPromise(listEvents('key', 'sess_1', 2, 'first'));
    expect(String(proxyFetchLegacy.mock.calls[0][0])).toContain('order=asc');
    expect(result.data?.map((event) => event.content?.[0]?.text)).toEqual(['newest', 'oldest']);
  });
});

const respondWith = (body: unknown) => {
  proxyFetchLegacy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body });
};
