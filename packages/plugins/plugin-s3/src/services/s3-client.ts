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

const request = async (input: URL, init: RequestInit & { headers?: Record<string, string> }): Promise<Response> => {
  const signal = AbortSignal.timeout(S3_TIMEOUT_MS);
  return fetch(input, { ...init, signal });
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

/** `undefined` when the object is absent (404) or the caller may not read it (403 on a private bucket). */
export const getObject = async (options: ReadOptions): Promise<Uint8Array | undefined> => {
  const response = await readRequest('GET', options);
  if (response.status === 404 || response.status === 403) {
    return undefined;
  }
  if (!response.ok) {
    throw new S3RequestError(response.status, response.statusText, await response.text().catch(() => ''));
  }

  return new Uint8Array(await response.arrayBuffer());
};

export const headObject = async (options: ReadOptions): Promise<boolean> => {
  const response = await readRequest('HEAD', options);
  if (response.status === 404 || response.status === 403) {
    return false;
  }
  if (!response.ok) {
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
