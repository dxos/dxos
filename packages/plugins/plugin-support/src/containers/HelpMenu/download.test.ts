//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { prereleaseChannel, resolveDownloadUrl } from './download';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('prereleaseChannel', () => {
  test('production has no prerelease channel — the dashboard link is correct there', ({ expect }) => {
    expect(prereleaseChannel('production')).toBeUndefined();
  });

  test('every other environment names its own channel', ({ expect }) => {
    expect(prereleaseChannel('nightly')).toBe('nightly');
    expect(prereleaseChannel('dev')).toBe('dev');
    expect(prereleaseChannel('staging')).toBe('staging');
  });

  test('an unset environment falls back to the dashboard rather than guessing a channel', ({ expect }) => {
    expect(prereleaseChannel(undefined)).toBeUndefined();
    expect(prereleaseChannel('')).toBeUndefined();
  });
});

describe('resolveDownloadUrl', () => {
  test('returns the asset url for the requested channel', async ({ expect }) => {
    const fetchSpy = mockFetch({ ok: true, json: () => Promise.resolve({ url: `${ASSET_ORIGIN}/asset/01ABC` }) });
    await expect(resolveDownloadUrl('nightly')).resolves.toBe(`${ASSET_ORIGIN}/asset/01ABC`);
    expect(fetchSpy.mock.calls[0][0]).toContain('?channel=nightly');
  });

  test('asks for 0.0.0 so any published build reads as an upgrade', async ({ expect }) => {
    const fetchSpy = mockFetch({ ok: true, json: () => Promise.resolve({ url: `${ASSET_ORIGIN}/asset/01ABC` }) });
    await resolveDownloadUrl('dev');
    expect(fetchSpy.mock.calls[0][0]).toContain('/0.0.0?');
  });

  test('encodes the channel so a name with url syntax reaches the endpoint intact', async ({ expect }) => {
    const fetchSpy = mockFetch({ ok: true, json: () => Promise.resolve({ url: `${ASSET_ORIGIN}/asset/01ABC` }) });
    await resolveDownloadUrl('a&b#c');
    const requested = new URL(String(fetchSpy.mock.calls[0][0]));
    expect(requested.searchParams.get('channel')).toBe('a&b#c');
  });

  test('bounds the request so a hanging endpoint cannot leave the link unresolved', async ({ expect }) => {
    const fetchSpy = mockFetch({ ok: true, json: () => Promise.resolve({ url: `${ASSET_ORIGIN}/asset/01ABC` }) });
    await resolveDownloadUrl('nightly');
    expect((fetchSpy.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  // The state every channel starts in: `nightly` 404s until its first deploy publishes to it, so the
  // caller's fallback to the dashboard has to be reachable rather than theoretical.
  test('throws when the channel has no published build', async ({ expect }) => {
    mockFetch({ ok: false, status: 404 });
    await expect(resolveDownloadUrl('nightly')).rejects.toThrow('update endpoint returned 404');
  });

  test('throws when the response carries no asset url', async ({ expect }) => {
    mockFetch({ ok: true, json: () => Promise.resolve({ version: '0.10.5' }) });
    await expect(resolveDownloadUrl('nightly')).rejects.toThrow('no asset url');
  });

  test('throws when the asset url is malformed', async ({ expect }) => {
    mockFetch({ ok: true, json: () => Promise.resolve({ url: 'not a url' }) });
    await expect(resolveDownloadUrl('nightly')).rejects.toThrow('malformed asset url');
  });

  test('throws when the asset url points somewhere other than the CDN', async ({ expect }) => {
    mockFetch({ ok: true, json: () => Promise.resolve({ url: 'https://evil.example/download' }) });
    await expect(resolveDownloadUrl('nightly')).rejects.toThrow('unexpected asset origin');
  });
});

const ASSET_ORIGIN = 'https://cdn.crabnebula.app';

const mockFetch = (response: Partial<Response> & { json?: () => Promise<unknown> }) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);
