//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { normalizeEndpoint } from './connector';

describe('s3 connector', () => {
  test('reduces a pasted url to its host', ({ expect }) => {
    expect(normalizeEndpoint('https://media.abc123.r2.cloudflarestorage.com/')).toBe(
      'media.abc123.r2.cloudflarestorage.com',
    );
    expect(normalizeEndpoint('  media.abc123.r2.cloudflarestorage.com  ')).toBe(
      'media.abc123.r2.cloudflarestorage.com',
    );
    expect(normalizeEndpoint('HTTPS://Media.ABC123.r2.cloudflarestorage.com/bucket/path')).toBe(
      'media.abc123.r2.cloudflarestorage.com',
    );
  });

  test('an empty endpoint stays empty so submit can reject it', ({ expect }) => {
    expect(normalizeEndpoint('   ')).toBe('');
  });
});
