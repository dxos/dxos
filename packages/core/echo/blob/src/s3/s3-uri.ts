//
// Copyright 2026 DXOS.org
//

import { isBlockedHost } from '@dxos/util';

import { DEFAULT_REGION, S3_SCHEME } from './constants.ts';

/**
 * A stored blob's address: `s3://<host>/<key>`, where `host` is the virtual-hosted-style bucket
 * endpoint (`media.<account>.r2.cloudflarestorage.com`, `media.s3.eu-west-1.amazonaws.com`).
 *
 * The host carries the bucket, so it is also the `AccessToken.source` the credential is filed
 * under — one connection per bucket, resolved without a side table mapping URIs to configuration.
 */
export type S3Uri = {
  host: string;
  key: string;
};

export const formatUri = ({ host, key }: S3Uri): string => `${S3_SCHEME}://${host}/${key}`;

/** Returns `undefined` for anything that is not one of this backend's URIs. */
export const parseUri = (uri: string): S3Uri | undefined => {
  const match = /^s3:\/\/([^/]+)\/(.+)$/.exec(uri);
  if (!match) {
    return undefined;
  }

  const [, host, key] = match;
  return { host, key };
};

/**
 * The HTTPS URL the object is served from. Public buckets resolve this without a signature.
 *
 * Rejects `.` and `..` segments rather than trying to carry them. WHATWG URL parsing resolves them
 * away, and percent-encoding does not help — it decodes `%2E` and normalizes anyway — so such a key
 * would silently be requested at a different path than the one it was stored under. Nothing this
 * package writes produces one (`objectKey` is a space id and a hex digest), so a key that reaches
 * here with a dot segment is a corrupted or hand-authored URI, and failing is better than reading
 * the wrong object.
 */
export const toHttpsUrl = ({ host, key }: S3Uri): URL => {
  const segments = key.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`Refusing to address an S3 key with a relative path segment: ${key}`);
  }

  const url = new URL(`https://${host}/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`);

  // Userinfo makes the authority lie: in `bucket.s3.amazonaws.com:443@169.254.169.254` everything
  // before the `@` is credentials, and the request goes to the address after it. Refuse it outright
  // rather than try to read past it — no legitimate bucket endpoint carries any.
  if (url.username !== '' || url.password !== '') {
    throw new Error(`Refusing to address an S3 endpoint carrying userinfo: ${host}`);
  }

  // Checked against the *parsed* hostname, which is what `fetch` will actually connect to. The host
  // comes from a stored `Blob` URI — replicated data, so on a headless host it is attacker-influenced
  // input to a server-side fetch. A browser is bounded by CORS; EDGE's function runtime is not, and
  // the unsigned read path needs no credential to reach an internal address.
  if (isBlockedHost(url.hostname)) {
    throw new Error(`Refusing to address an S3 endpoint on a private or loopback host: ${url.hostname}`);
  }

  return url;
};

/**
 * SigV4 signing region for an endpoint. AWS encodes it in the hostname; R2 and most self-hosted
 * S3 implementations do not, and take {@link DEFAULT_REGION}.
 *
 * The legacy global endpoint (`bucket.s3.amazonaws.com`, no region segment) is the exception: it
 * routes to us-east-1 and must be signed for that region, since signing it `auto` yields
 * `SignatureDoesNotMatch` rather than anything that names the real problem.
 */
export const regionFromHost = (host: string): string => {
  if (/(?:^|\.)s3\.amazonaws\.com$/.test(host)) {
    return 'us-east-1';
  }

  const match = /(?:^|\.)s3[.-]([a-z0-9-]+)\.amazonaws\.com$/.exec(host);
  return match ? match[1] : DEFAULT_REGION;
};

/**
 * Object key for a blob. Content-addressed by the digest the blob manager already computed, under a
 * space-scoped prefix so one bucket can serve many spaces and a listing stays navigable. The
 * original filename is deliberately not in the path — it is not unique, and ECHO holds it.
 */
export const objectKey = ({ spaceId, contentHash }: { spaceId: string; contentHash: string }): string =>
  `${spaceId}/${contentHash}`;
