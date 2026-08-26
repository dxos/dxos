//
// Copyright 2026 DXOS.org
//

import { PRESIGN_EXPIRY_SECONDS, S3_TIMEOUT_MS } from '../constants';
import { type S3Uri, regionFromHost, toHttpsUrl } from './s3-uri';
import { type SigningCredentials, presignUrl, signRequest, toArrayBufferView } from './sigv4';

/**
 * The key pair for one bucket. `undefined` wherever a caller has no credential for the endpoint —
 * every read path then falls through to an unsigned request, which succeeds on a public bucket and
 * 403s on a private one. That is the intended behavior: rendering a shared object must not require
 * the viewer to hold the writer's keys.
 */
export type S3Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
};

const toSigningCredentials = (credentials: S3Credentials, host: string): SigningCredentials => ({
  ...credentials,
  region: regionFromHost(host),
});

/** Rejects rather than resolving `undefined`: a transport failure is not a missing object. */
export class S3RequestError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly body: string,
  ) {
    super(`S3 request failed: ${status} ${statusText}${body ? ` — ${body}` : ''}`);
    this.name = 'S3RequestError';
  }
}

/**
 * A request the browser refused to send or whose response it refused to expose. Almost always a
 * missing bucket CORS policy, which `fetch` reports as an opaque `TypeError` with the real reason
 * confined to the devtools console — so name the likely cause here rather than let a blocked
 * preflight surface as "Failed to fetch".
 */
export class S3NetworkError extends Error {
  constructor(
    readonly host: string,
    override readonly cause: unknown,
  ) {
    super(
      `Could not reach ${host}. The bucket's CORS policy must allow this origin for GET, HEAD and PUT ` +
        `(and the authorization, x-amz-content-sha256 and x-amz-date headers). Original error: ` +
        String(cause instanceof Error ? cause.message : cause),
    );
    this.name = 'S3NetworkError';
  }
}

const request = async (input: URL, init: RequestInit & { headers?: Record<string, string> }): Promise<Response> => {
  const signal = AbortSignal.timeout(S3_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal });
  } catch (cause) {
    throw new S3NetworkError(input.host, cause);
  }
};

export type PutOptions = {
  uri: S3Uri;
  data: Uint8Array;
  contentType?: string;
  /** Hex SHA-256 of `data`, already computed by the blob manager. */
  contentHash: string;
  credentials: S3Credentials;
  now?: () => Date;
};

export const putObject = async ({
  uri,
  data,
  contentType,
  contentHash,
  credentials,
  now = () => new Date(),
}: PutOptions): Promise<void> => {
  const url = toHttpsUrl(uri);
  const headers = await signRequest({
    method: 'PUT',
    url,
    // `content-length` is deliberately absent: it is a forbidden header name, so the browser sets it
    // itself and strips ours — signing it would guarantee a mismatch the server reports as a bad
    // signature rather than a missing header.
    headers: contentType ? { 'content-type': contentType } : {},
    payloadHash: contentHash,
    credentials: toSigningCredentials(credentials, uri.host),
    date: now(),
  });

  const response = await request(url, { method: 'PUT', headers, body: toArrayBufferView(data) });
  if (!response.ok) {
    throw new S3RequestError(response.status, response.statusText, await response.text().catch(() => ''));
  }
};

export type ReadOptions = {
  uri: S3Uri;
  /** Omitted for an unsigned read against a public bucket. */
  credentials?: S3Credentials;
  now?: () => Date;
};

const readRequest = async (
  method: 'GET' | 'HEAD',
  { uri, credentials, now = () => new Date() }: ReadOptions,
): Promise<Response> => {
  const url = toHttpsUrl(uri);
  const headers = credentials
    ? await signRequest({
        method,
        url,
        credentials: toSigningCredentials(credentials, uri.host),
        date: now(),
      })
    : undefined;

  return request(url, { method, headers });
};

/**
 * Whether a failed read should be reported as "not there" rather than raised.
 *
 * A signed read is authoritative, so only 404 and 403 are misses and anything else is a fault worth
 * surfacing. An unsigned read is speculative — it is a guess that the bucket is public — so any
 * client error just means "not publicly readable". The distinction is load-bearing: R2 answers an
 * unauthenticated request to a private bucket with `400 InvalidArgument`, not the 403 that AWS
 * returns, so a 404/403-only rule turns the public-bucket fallback into a thrown error.
 */
const isMiss = (status: number, signed: boolean): boolean =>
  signed ? status === 404 || status === 403 : status >= 400 && status < 500;

/** `undefined` when the object is absent, or not readable with the credentials in hand. */
export const getObject = async (options: ReadOptions): Promise<Uint8Array | undefined> => {
  const response = await readRequest('GET', options);
  if (!response.ok) {
    if (isMiss(response.status, !!options.credentials)) {
      return undefined;
    }
    throw new S3RequestError(response.status, response.statusText, await response.text().catch(() => ''));
  }

  return new Uint8Array(await response.arrayBuffer());
};

export const headObject = async (options: ReadOptions): Promise<boolean> => {
  const response = await readRequest('HEAD', options);
  if (!response.ok) {
    if (isMiss(response.status, !!options.credentials)) {
      return false;
    }
    throw new S3RequestError(response.status, response.statusText, await response.text().catch(() => ''));
  }

  return true;
};

/**
 * A URL an `<img>`/`<video>` can load directly. Presigned when a credential is available; the plain
 * public URL otherwise, which is correct for a public bucket and simply fails to load for a private
 * one — the same outcome as returning nothing, without suppressing the browser's own diagnostics.
 */
export const getObjectUrl = async ({ uri, credentials, now = () => new Date() }: ReadOptions): Promise<string> => {
  const url = toHttpsUrl(uri);
  if (!credentials) {
    return url.toString();
  }

  return presignUrl({
    url,
    expiresIn: PRESIGN_EXPIRY_SECONDS,
    credentials: toSigningCredentials(credentials, uri.host),
    date: now(),
  });
};
