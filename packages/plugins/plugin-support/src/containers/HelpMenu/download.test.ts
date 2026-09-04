//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DOWNLOAD_URL, downloadUrl, prereleaseChannel } from './download';

describe('prereleaseChannel', () => {
  test('production has no prerelease channel — the dashboard link is correct there', ({ expect }) => {
    expect(prereleaseChannel('production')).toBeUndefined();
  });

  test('every other environment names its own channel', ({ expect }) => {
    expect(prereleaseChannel('preview')).toBe('preview');
    expect(prereleaseChannel('dev')).toBe('dev');
    expect(prereleaseChannel('staging')).toBe('staging');
  });

  test('an unset environment falls back to the dashboard rather than guessing a channel', ({ expect }) => {
    expect(prereleaseChannel(undefined)).toBeUndefined();
    expect(prereleaseChannel('')).toBeUndefined();
  });
});

describe('downloadUrl', () => {
  test('production links at the dashboard', ({ expect }) => {
    expect(downloadUrl('production')).toBe(DOWNLOAD_URL);
  });

  test('an unset environment links at the dashboard rather than guessing a channel', ({ expect }) => {
    expect(downloadUrl(undefined)).toBe(DOWNLOAD_URL);
    expect(downloadUrl('')).toBe(DOWNLOAD_URL);
  });

  test('a prerelease channel links straight at its own latest installer', ({ expect }) => {
    expect(downloadUrl('preview')).toBe(
      'https://cdn.crabnebula.app/download/dxos/composer/latest/platform/dmg-aarch64?channel=preview',
    );
    expect(downloadUrl('dev')).toBe(
      'https://cdn.crabnebula.app/download/dxos/composer/latest/platform/dmg-aarch64?channel=dev',
    );
  });

  test('encodes the channel so a name with url syntax reaches the endpoint intact', ({ expect }) => {
    const url = new URL(downloadUrl('a&b#c'));
    expect(url.searchParams.get('channel')).toBe('a&b#c');
  });
});
