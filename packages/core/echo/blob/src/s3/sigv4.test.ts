//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { encodeObjectKey, formatTimestamps, presignUrl, sha256Hex, signRequest, uriEncode } from './sigv4.ts';

/**
 * Credentials and timestamp from the published AWS SigV4 examples. The expected signatures below are
 * AWS's own — they are what makes these tests evidence that the implementation is correct, rather
 * than merely self-consistent.
 */
const CREDENTIALS = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
};

const DATE = new Date('2013-05-24T00:00:00Z');

describe('sigv4', () => {
  test('formats both timestamp forms', ({ expect }) => {
    expect(formatTimestamps(DATE)).toEqual({ amzDate: '20130524T000000Z', dateStamp: '20130524' });
  });

  test('hashes the empty payload to the documented digest', async ({ expect }) => {
    expect(await sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  test('escapes the characters encodeURIComponent leaves alone', ({ expect }) => {
    expect(uriEncode("a!b'c(d)e*f")).toBe('a%21b%27c%28d%29e%2Af');
    expect(uriEncode('a b/c')).toBe('a%20b%2Fc');
  });

  test('keeps path separators while escaping each segment', ({ expect }) => {
    expect(encodeObjectKey('space id/a b.png')).toBe('space%20id/a%20b.png');
  });

  // https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html — GET Object.
  test('matches the AWS GET Object header-auth vector', async ({ expect }) => {
    const headers = await signRequest({
      method: 'GET',
      url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'),
      headers: { range: 'bytes=0-9' },
      credentials: CREDENTIALS,
      date: DATE,
    });

    expect(headers.Authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, ' +
        'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    );
  });

  // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
  test('matches the AWS presigned-URL vector', async ({ expect }) => {
    const url = await presignUrl({
      url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'),
      expiresIn: 86400,
      credentials: CREDENTIALS,
      date: DATE,
    });

    expect(new URL(url).searchParams.get('X-Amz-Signature')).toBe(
      'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
    );
  });

  test('presigned url carries every parameter the verifier needs', async ({ expect }) => {
    const url = new URL(
      await presignUrl({
        url: new URL('https://media.abc.r2.cloudflarestorage.com/space/hash'),
        expiresIn: 900,
        credentials: { ...CREDENTIALS, region: 'auto' },
        date: DATE,
      }),
    );

    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Credential')).toBe('AKIAIOSFODNN7EXAMPLE/20130524/auto/s3/aws4_request');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('host');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  test('a different key produces a different signature', async ({ expect }) => {
    const sign = (secretAccessKey: string) =>
      signRequest({
        method: 'GET',
        url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'),
        credentials: { ...CREDENTIALS, secretAccessKey },
        date: DATE,
      });

    expect((await sign('one')).Authorization).not.toBe((await sign('two')).Authorization);
  });
});
