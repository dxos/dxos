//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { EffectEx } from '@dxos/effect';
import type * as Observability from '@dxos/observability/Observability';

import * as SupportService from './SupportService';

const observabilityWith = (support: Observability.Observability['support']): Observability.Observability =>
  ({ support }) as unknown as Observability.Observability;

/** Runs to a result so a failure is asserted on rather than thrown. */
const run = <A, E>(effect: Effect.Effect<A, E>) =>
  EffectEx.runPromise(Effect.result(effect)).then((result) =>
    result._tag === 'Success'
      ? { value: result.success, error: undefined }
      : { value: undefined, error: result.failure },
  );

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
    const { value, error } = await run(
      SupportService.submitSupportReport({
        endpoint: 'https://edge.test/discord',
        observability: observabilityWith({
          uploadLogs: async () => 'logs/1.ndjson',
          sessionContext: () => ({ distinctId: 'did:dx:me', widgetSessionId: 'w-1', sessionId: 's-1' }),
          flushLogs,
        }),
        report: { title: 'Broken', body: 'It broke.', type: 'bug', includeLogs: true },
        did: 'did:dx:me',
      }),
    );

    expect(error).toBeUndefined();
    expect(value).toEqual({ ticketId: 'ticket-1', threadUrl: 'https://discord.test/t' });
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
    await vi.waitFor(() => expect(flushLogs).toHaveBeenCalledWith({ ticketId: 'ticket-1' }));
  });

  test('skips the logs entirely when the reporter opted out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ticketId: 'ticket-2', threadUrl: 'https://discord.test/t' }))),
    );
    const uploadLogs = vi.fn(async () => 'never');
    const flushLogs = vi.fn(async () => {});
    const { error } = await run(
      SupportService.submitSupportReport({
        endpoint: 'https://edge.test/discord',
        observability: observabilityWith({ uploadLogs, sessionContext: () => undefined, flushLogs }),
        report: { title: 'Broken', body: 'It broke.', includeLogs: false },
      }),
    );

    expect(error).toBeUndefined();
    expect(uploadLogs).not.toHaveBeenCalled();
    expect(flushLogs).not.toHaveBeenCalled();
  });

  test('refuses a success that names no public thread, since nobody would see the report', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ticketId: 'ticket-3' }))),
    );
    const { error } = await run(
      SupportService.submitSupportReport({
        endpoint: 'https://edge.test/discord',
        observability: observabilityWith({
          uploadLogs: async () => undefined,
          sessionContext: () => undefined,
          flushLogs: async () => {},
        }),
        report: { title: 'Broken', body: 'It broke.' },
      }),
    );

    expect(error?.name).toBe('SupportSubmitError');
  });

  test('fails with a tagged error when the service rejects the report', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 502 })),
    );
    const { error } = await run(
      SupportService.submitSupportReport({
        endpoint: 'https://edge.test/discord',
        observability: observabilityWith({
          uploadLogs: async () => undefined,
          sessionContext: () => undefined,
          flushLogs: async () => {},
        }),
        report: { title: 'Broken', body: 'It broke.' },
      }),
    );

    expect(error?.name).toBe('SupportSubmitError');
    expect(error?.context).toMatchObject({ status: 502 });
  });
});

describe('submitSupportIssue', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('files the issue with the dump key, then flushes with the report id', async () => {
    const issue = {
      reportId: 'r-1',
      issueId: 'issue-uuid',
      issueIdentifier: 'DX-7',
      issueUrl: 'https://linear.test/DX-7',
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(issue)));
    vi.stubGlobal('fetch', fetchMock);
    const flushLogs = vi.fn(async () => {});
    const { value, error } = await run(
      SupportService.submitSupportIssue({
        endpoint: 'https://edge.test/discord',
        observability: observabilityWith({
          uploadLogs: async () => 'logs/1.ndjson',
          sessionContext: () => ({ distinctId: 'did:dx:me', widgetSessionId: 'w-1', replayUrl: 'https://r' }),
          flushLogs,
        }),
        report: { title: 'Broken', body: 'It broke.', type: 'bug', includeLogs: true },
        did: 'did:dx:me',
      }),
    );

    expect(error).toBeUndefined();
    expect(value).toEqual(issue);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://edge.test/discord/issue');
    expect(JSON.parse(String(init.body))).toMatchObject({ title: 'Broken', did: 'did:dx:me', logKey: 'logs/1.ndjson' });
    await vi.waitFor(() => expect(flushLogs).toHaveBeenCalledWith({ reportId: 'r-1' }));
  });

  test('fails with SupportForbiddenError when the service refuses the identity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'internal accounts only' }), { status: 403 })),
    );
    const { error } = await run(
      SupportService.submitSupportIssue({
        endpoint: 'https://edge.test/discord',
        observability: observabilityWith({
          uploadLogs: async () => undefined,
          sessionContext: () => undefined,
          flushLogs: async () => {},
        }),
        report: { title: 'Broken', body: 'It broke.' },
        did: 'did:dx:me',
      }),
    );

    expect(error?.name).toBe('SupportForbiddenError');
  });
});
