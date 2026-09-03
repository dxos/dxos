//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { composeHost, normalizeEndpoint } from './connector';

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

  test('joins the bucket onto an account endpoint', ({ expect }) => {
    expect(composeHost({ bucket: 'media', endpoint: 'abc123.r2.cloudflarestorage.com' })).toBe(
      'media.abc123.r2.cloudflarestorage.com',
    );
    expect(composeHost({ bucket: 'media', endpoint: 's3.eu-west-1.amazonaws.com' })).toBe(
      'media.s3.eu-west-1.amazonaws.com',
    );
  });

  // The endpoint field used to ask for the joined host, and a user copying a bucket URL pastes one.
  test('does not double the bucket when the endpoint already carries it', ({ expect }) => {
    expect(composeHost({ bucket: 'media', endpoint: 'media.abc123.r2.cloudflarestorage.com' })).toBe(
      'media.abc123.r2.cloudflarestorage.com',
    );
    expect(composeHost({ bucket: 'Media', endpoint: 'https://media.abc123.r2.cloudflarestorage.com/' })).toBe(
      'media.abc123.r2.cloudflarestorage.com',
    );
  });
});
