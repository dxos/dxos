//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { getObject, headObject, probeAccess } from './s3-client';

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

  // A rejection during the body read that is NOT our timeout must pass through unchanged, rather
  // than being relabelled. The timeout half of that branch has no test: driving it needs the real
  // S3_TIMEOUT_MS deadline to elapse, and a fake-timer version did not reliably intercept the
  // already-scheduled timer. Left untested rather than covered by something slow and flaky.
  test('a non-timeout body-read failure is not relabelled', async ({ expect }) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const body = new ReadableStream({
          start: (controller) => controller.error(new Error('connection reset')),
        });
        return new Response(body, { status: 200 });
      }),
    );
    await expect(getObject({ uri: URI, credentials: CREDENTIALS })).rejects.toThrow(/connection reset/);
  });

  test('a successful read returns the bytes', async ({ expect }) => {
    respondWith(200);
    await expect(getObject({ uri: URI, credentials: CREDENTIALS })).resolves.toEqual(new Uint8Array([1, 2, 3]));
    await expect(headObject({ uri: URI, credentials: CREDENTIALS })).resolves.toBe(true);
  });
});

/** The probe's messages are what the connection UI shows, so they are the behaviour under test. */
describe('probeAccess diagnosis', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const respondWithCode = (status: number, code?: string) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(code ? `<Error><Code>${code}</Code></Error>` : '', { status })),
    );
  };

  test('a missing probe key means the signature was accepted', async ({ expect }) => {
    respondWithCode(404);
    await expect(probeAccess({ uri: URI, credentials: CREDENTIALS })).resolves.toBeUndefined();
  });

  test('names a wrong access key id', async ({ expect }) => {
    respondWithCode(403, 'InvalidAccessKeyId');
    await expect(probeAccess({ uri: URI, credentials: CREDENTIALS })).rejects.toThrow('Unknown access key ID.');
  });

  test('names a wrong secret rather than blaming the key id', async ({ expect }) => {
    respondWithCode(403, 'SignatureDoesNotMatch');
    await expect(probeAccess({ uri: URI, credentials: CREDENTIALS })).rejects.toThrow('Wrong secret access key.');
  });

  test('distinguishes a valid key without permission', async ({ expect }) => {
    respondWithCode(403, 'AccessDenied');
    await expect(probeAccess({ uri: URI, credentials: CREDENTIALS })).rejects.toThrow('Key not permitted on "bucket".');
  });

  test('names a bad bucket, which is the likeliest typo', async ({ expect }) => {
    respondWithCode(400, 'InvalidBucketName');
    await expect(probeAccess({ uri: URI, credentials: CREDENTIALS })).rejects.toThrow('No such bucket: "bucket".');
  });

  // The case that actually bit: a blocked CORS preflight rejects `fetch` itself, so there is no
  // status to read and the recommendation has to come from the error we synthesise.
  test('a blocked request recommends the CORS policy', async ({ expect }) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(probeAccess({ uri: URI, credentials: CREDENTIALS })).rejects.toThrow(
      /^Blocked by CORS: the bucket must allow .* for GET, HEAD and PUT\.$/,
    );
  });

  // These render as a one-line status, so length is part of the contract rather than a nicety.
  test('every diagnosis stays short enough to read at a glance', async ({ expect }) => {
    for (const [status, code] of [
      [403, 'InvalidAccessKeyId'],
      [403, 'SignatureDoesNotMatch'],
      [403, 'AccessDenied'],
      [400, 'InvalidBucketName'],
    ] as const) {
      respondWithCode(status, code);
      await probeAccess({ uri: URI, credentials: CREDENTIALS }).then(
        () => expect.fail(`expected ${code} to be reported as a failure`),
        (error) => expect(error.message.length).toBeLessThanOrEqual(60),
      );
    }
  });
});
