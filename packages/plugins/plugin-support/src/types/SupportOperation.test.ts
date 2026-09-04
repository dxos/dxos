//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import type * as Observability from '@dxos/observability/Observability';

import * as SupportOperation from './SupportOperation';

/** Just the support slice of Observability; the rest is never touched here. */
const observabilityWith = (support: Observability.Observability['support']): Observability.Observability =>
  ({ support }) as unknown as Observability.Observability;

describe('submitSupportReport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('uploads the dump, files the report with its key and session, then flushes with the ticket id', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ticketId: 'ticket-1', threadUrl: 'https://discord.test/t' })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const flushLogs = vi.fn(async () => {});
    const result = await SupportOperation.submitSupportReport({
      endpoint: 'https://edge.test/discord',
      observability: observabilityWith({
        uploadLogs: async () => 'logs/1.ndjson',
        sessionContext: () => ({ distinctId: 'did:dx:me', widgetSessionId: 'w-1', sessionId: 's-1' }),
        flushLogs,
      }),
      report: { title: 'Broken', body: 'It broke.', type: 'bug', includeLogs: true },
      did: 'did:dx:me',
    });

    expect(result).toEqual({ ticketId: 'ticket-1', threadUrl: 'https://discord.test/t' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://edge.test/discord/feedback');
    expect(JSON.parse(String(init.body))).toEqual({
      title: 'Broken',
      body: 'It broke.',
      type: 'bug',
      did: 'did:dx:me',
      logKey: 'logs/1.ndjson',
      posthog: { distinctId: 'did:dx:me', widgetSessionId: 'w-1', sessionId: 's-1' },
    });
    await vi.waitFor(() => expect(flushLogs).toHaveBeenCalledWith('ticket-1'));
  });

  test('skips the logs entirely when the reporter opted out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ticketId: 'ticket-2' }))),
    );
    const uploadLogs = vi.fn(async () => 'never');
    const flushLogs = vi.fn(async () => {});
    await SupportOperation.submitSupportReport({
      endpoint: 'https://edge.test/discord',
      observability: observabilityWith({ uploadLogs, sessionContext: () => undefined, flushLogs }),
      report: { title: 'Broken', body: 'It broke.', includeLogs: false },
    });
    expect(uploadLogs).not.toHaveBeenCalled();
    expect(flushLogs).not.toHaveBeenCalled();
  });

  test('fails when the service does not answer with a ticket', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 502 })),
    );
    await expect(
      SupportOperation.submitSupportReport({
        endpoint: 'https://edge.test/discord',
        observability: observabilityWith({
          uploadLogs: async () => undefined,
          sessionContext: () => undefined,
          flushLogs: async () => {},
        }),
        report: { title: 'Broken', body: 'It broke.' },
      }),
    ).rejects.toThrow('502');
  });
});
