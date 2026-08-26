//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { getObject, headObject } from './s3-client';

const URI = { host: 'bucket.account.r2.cloudflarestorage.com', key: 'SPACE/hash' };
const CREDENTIALS = { accessKeyId: 'AKIA', secretAccessKey: 'secret' };

const respondWith = (status: number) => {
  const fetchMock = vi.fn(async () => new Response(status === 200 ? new Uint8Array([1, 2, 3]) : '', { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('s3 client read semantics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('a signed read treats 404 and 403 as a miss', async ({ expect }) => {
    for (const status of [404, 403]) {
      respondWith(status);
      await expect(getObject({ uri: URI, credentials: CREDENTIALS })).resolves.toBeUndefined();
      await expect(headObject({ uri: URI, credentials: CREDENTIALS })).resolves.toBe(false);
    }
  });

  test('a signed read raises anything else, so a real fault is not hidden', async ({ expect }) => {
    for (const status of [400, 429, 500]) {
      respondWith(status);
      await expect(getObject({ uri: URI, credentials: CREDENTIALS })).rejects.toThrow(/S3 request failed/);
    }
  });

  // R2 answers an unauthenticated request to a private bucket with 400 InvalidArgument rather than
  // the 403 AWS returns. Verified against a live bucket; a 404/403-only rule made the public-bucket
  // fallback throw instead of reporting a miss.
  test('an unsigned read treats any client error as not-publicly-readable', async ({ expect }) => {
    for (const status of [400, 401, 403, 404]) {
      respondWith(status);
      await expect(getObject({ uri: URI })).resolves.toBeUndefined();
      await expect(headObject({ uri: URI })).resolves.toBe(false);
    }
  });

  test('an unsigned read still raises a server error', async ({ expect }) => {
    respondWith(503);
    await expect(getObject({ uri: URI })).rejects.toThrow(/S3 request failed/);
  });

  test('a successful read returns the bytes', async ({ expect }) => {
    respondWith(200);
    await expect(getObject({ uri: URI, credentials: CREDENTIALS })).resolves.toEqual(new Uint8Array([1, 2, 3]));
    await expect(headObject({ uri: URI, credentials: CREDENTIALS })).resolves.toBe(true);
  });
});
