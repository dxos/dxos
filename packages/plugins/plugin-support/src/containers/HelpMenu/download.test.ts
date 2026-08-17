//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import { prereleaseChannel, resolveDownloadUrl } from './download';

const mockFetch = (response: Partial<Response> & { json?: () => Promise<unknown> }) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('prereleaseChannel', () => {
  test('production has no prerelease channel — the dashboard link is correct there', () => {
    expect(prereleaseChannel('production')).toBeUndefined();
  });

  test('every other environment names its own channel', () => {
    expect(prereleaseChannel('nightly')).toBe('nightly');
    expect(prereleaseChannel('dev')).toBe('dev');
    expect(prereleaseChannel('staging')).toBe('staging');
  });

  test('an unset environment falls back to the dashboard rather than guessing a channel', () => {
    expect(prereleaseChannel(undefined)).toBeUndefined();
    expect(prereleaseChannel('')).toBeUndefined();
  });
});

describe('resolveDownloadUrl', () => {
  test('returns the asset url for the requested channel', async () => {
    const fetchSpy = mockFetch({ ok: true, json: () => Promise.resolve({ url: 'https://cdn/asset/01ABC' }) });
    await expect(resolveDownloadUrl('nightly')).resolves.toBe('https://cdn/asset/01ABC');
    expect(fetchSpy.mock.calls[0][0]).toContain('?channel=nightly');
  });

  test('asks for 0.0.0 so any published build reads as an upgrade', async () => {
    const fetchSpy = mockFetch({ ok: true, json: () => Promise.resolve({ url: 'https://cdn/asset/01ABC' }) });
    await resolveDownloadUrl('dev');
    expect(fetchSpy.mock.calls[0][0]).toContain('/0.0.0?');
  });

  // The state every channel starts in: `nightly` 404s until its first deploy publishes to it, so the
  // caller's fallback to the dashboard has to be reachable rather than theoretical.
  test('throws when the channel has no published build', async () => {
    mockFetch({ ok: false, status: 404 });
    await expect(resolveDownloadUrl('nightly')).rejects.toThrow('update endpoint returned 404');
  });

  test('throws when the response carries no asset url', async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ version: '0.10.5' }) });
    await expect(resolveDownloadUrl('nightly')).rejects.toThrow('no asset url');
  });
});
