//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_REGION } from './constants';
import { formatUri, objectKey, parseUri, regionFromHost, toHttpsUrl } from './s3-uri';

describe('s3 uri', () => {
  test('round-trips through format and parse', ({ expect }) => {
    const uri = { host: 'media.abc123.r2.cloudflarestorage.com', key: 'SPACEID/deadbeef' };
    expect(parseUri(formatUri(uri))).toEqual(uri);
  });

  test('keeps slashes in a nested key', ({ expect }) => {
    expect(parseUri('s3://host/a/b/c')).toEqual({ host: 'host', key: 'a/b/c' });
  });

  test('rejects a uri belonging to another backend', ({ expect }) => {
    expect(parseUri('wnfs://host/key')).toBeUndefined();
    expect(parseUri('ni:///sha-256;abc')).toBeUndefined();
    expect(parseUri('s3://host-with-no-key')).toBeUndefined();
  });

  test('builds an https url with each segment escaped', ({ expect }) => {
    expect(toHttpsUrl({ host: 'bucket.example.com', key: 'a b/c+d' }).toString()).toBe(
      'https://bucket.example.com/a%20b/c%2Bd',
    );
  });

  test('reads the signing region out of an AWS hostname', ({ expect }) => {
    expect(regionFromHost('media.s3.eu-west-1.amazonaws.com')).toBe('eu-west-1');
    expect(regionFromHost('s3.us-east-2.amazonaws.com')).toBe('us-east-2');
  });

  // The legacy global endpoint carries no region but routes to us-east-1; signing it `auto` fails
  // with SignatureDoesNotMatch, which names nothing useful.
  test('signs the legacy global endpoint as us-east-1', ({ expect }) => {
    expect(regionFromHost('media.s3.amazonaws.com')).toBe('us-east-1');
    expect(regionFromHost('s3.amazonaws.com')).toBe('us-east-1');
  });

  // WHATWG URL parsing resolves these away — and decodes %2E first, so encoding cannot save them.
  // Reading the wrong object silently is worse than refusing to address it.
  test('refuses a key with a relative path segment', ({ expect }) => {
    expect(() => toHttpsUrl({ host: 'bucket.example.com', key: './file' })).toThrow(/relative path segment/);
    expect(() => toHttpsUrl({ host: 'bucket.example.com', key: 'folder/../file' })).toThrow(/relative path segment/);
  });

  // A blob URI is replicated data, so on a headless host its endpoint is attacker-influenced input
  // to a server-side fetch — and the unsigned read path needs no credential to reach one.
  test('refuses a private or loopback endpoint', ({ expect }) => {
    for (const host of ['127.0.0.1', 'localhost', '169.254.169.254', '10.0.0.1', '192.168.1.1', '[::1]']) {
      expect(() => toHttpsUrl({ host, key: 'a/b' }), host).toThrow(/private or loopback host/);
    }
  });

  // Userinfo makes the authority lie: everything before the `@` is credentials, so a string check
  // on the leading text sees an allowed bucket while the request goes to the address after it.
  test('refuses an authority carrying userinfo', ({ expect }) => {
    expect(() => toHttpsUrl({ host: 'bucket.s3.amazonaws.com:443@169.254.169.254', key: 'a/b' })).toThrow(
      /userinfo|private or loopback/,
    );
    expect(() => toHttpsUrl({ host: 'user:pass@127.0.0.1', key: 'a/b' })).toThrow(/userinfo|private or loopback/);
  });

  test('a dot inside a segment is untouched', ({ expect }) => {
    expect(toHttpsUrl({ host: 'bucket.example.com', key: 'a/file.png' }).pathname).toBe('/a/file.png');
    expect(toHttpsUrl({ host: 'bucket.example.com', key: 'a/...b' }).pathname).toBe('/a/...b');
  });

  test('falls back to the default region for endpoints that encode none', ({ expect }) => {
    expect(regionFromHost('media.abc123.r2.cloudflarestorage.com')).toBe(DEFAULT_REGION);
    expect(regionFromHost('minio.internal:9000')).toBe(DEFAULT_REGION);
  });

  test('scopes the object key by space', ({ expect }) => {
    expect(objectKey({ spaceId: 'SPACEID', contentHash: 'deadbeef' })).toBe('SPACEID/deadbeef');
  });
});
