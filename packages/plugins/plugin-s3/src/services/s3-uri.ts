//
// Copyright 2026 DXOS.org
//

import { DEFAULT_REGION, S3_SCHEME } from '../constants';

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

/** The HTTPS URL the object is served from. Public buckets resolve this without a signature. */
export const toHttpsUrl = ({ host, key }: S3Uri): URL =>
  new URL(
    `https://${host}/${key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`,
  );

/**
 * SigV4 signing region for an endpoint. AWS encodes it in the hostname; R2 and most self-hosted
 * S3 implementations do not, and take {@link DEFAULT_REGION}.
 */
export const regionFromHost = (host: string): string => {
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
