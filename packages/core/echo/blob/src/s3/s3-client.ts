//
// Copyright 2026 DXOS.org
//

import { PRESIGN_EXPIRY_SECONDS, S3_TIMEOUT_MS } from './constants';
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

/** The page's own origin, which is what a bucket CORS policy has to name. */
const currentOrigin = (): string =>
  typeof globalThis.location?.origin === 'string' ? globalThis.location.origin : 'this origin';

/**
 * A request the browser refused to send, or whose response it refused to expose. Almost always a
 * missing bucket CORS policy: `fetch` reports that as an opaque `TypeError` and confines the real
 * reason to the devtools console, so a blocked preflight would otherwise reach the user as
 * "Failed to fetch".
 *
 * The message names the origin and the methods only. The required headers are in the README and in
 * `details` — a status line has to be readable at a glance, and nobody writes a CORS policy from
 * memory of a sentence anyway.
 */
export class S3NetworkError extends Error {
  /** The full policy requirement, for logs and docs rather than the status line. */
  readonly details: string;

  constructor(
    readonly host: string,
    override readonly cause: unknown,
  ) {
    super(`Blocked by CORS: the bucket must allow ${currentOrigin()} for GET, HEAD and PUT.`);
    this.name = 'S3NetworkError';
    this.details =
      `${host} must allow origin ${currentOrigin()} for GET, HEAD and PUT, with the ` +
      'authorization, content-type, x-amz-content-sha256 and x-amz-date headers.';
  }
}

/**
 * The request exceeded its deadline. Distinct from {@link S3NetworkError} because the remedies have
 * nothing in common — a timeout says the endpoint is slow or unreachable, not that a bucket policy
 * is wrong, and conflating them sends the user to edit configuration that is already correct.
 */
export class S3TimeoutError extends Error {
  constructor(
    readonly host: string,
    readonly timeoutMs: number,
  ) {
    super(`${host} did not respond within ${Math.round(timeoutMs / 1000)}s.`);
    this.name = 'S3TimeoutError';
  }
}

/** The S3 `<Code>` from an error body, which says far more than the HTTP status alone. */
const errorCode = (body: string): string | undefined => /<Code>([^<]+)<\/Code>/.exec(body)?.[1];

/**
 * Checks that the credential can address the bucket, and explains it when it cannot.
 *
 * Distinct from `headObject`, which deliberately reports 403 and 404 alike as "not there" — correct
 * when reading a blob, useless for a connection test, where telling a rejected key from an absent
 * object is the entire point. Probes a key that should not exist: 404 proves the signature was
 * accepted, and every other outcome names what to fix.
 */
export const probeAccess = async ({ uri, credentials }: { uri: S3Uri; credentials: S3Credentials }): Promise<void> => {
  const url = toHttpsUrl(uri);
  const headers = await signRequest({
    method: 'HEAD',
    url,
    credentials: toSigningCredentials(credentials, uri.host),
    date: new Date(),
  });

  // HEAD returns no body, so a failure is re-issued as GET purely to read the S3 error code.
  const { response, done } = await request(url, { method: 'HEAD', headers });
  done();
  if (response.ok || response.status === 404) {
    return;
  }

  const getHeaders = await signRequest({
    method: 'GET',
    url,
    credentials: toSigningCredentials(credentials, uri.host),
    date: new Date(),
  });
  const body = await request(url, { method: 'GET', headers: getHeaders })
    .then(async ({ response: errorResponse, done: doneReadingError, read }) => {
      try {
        return await read(() => errorResponse.text());
      } finally {
        doneReadingError();
      }
    })
    .catch(() => '');

  // Kept to one short clause each: this renders as a status line, and the endpoint and key id are
  // already on screen beside it as connection metadata, so repeating them here is noise.
  const bucket = uri.host.split('.')[0];
  switch (errorCode(body) ?? String(response.status)) {
    case 'InvalidAccessKeyId':
      throw new Error('Unknown access key ID.');
    case 'SignatureDoesNotMatch':
      throw new Error('Wrong secret access key.');
    case 'AccessDenied':
      throw new Error(`Key not permitted on "${bucket}".`);
    case 'NoSuchBucket':
    case 'InvalidBucketName':
      throw new Error(`No such bucket: "${bucket}".`);
    default:
      throw new S3RequestError(response.status, response.statusText, body);
  }
};

type TimedRequest = {
  response: Response;
  /** Cancels the deadline; call once the body has been consumed. */
  done: () => void;
  /** Runs a body read under the same timeout classification as the header phase. */
  read: <T>(consume: () => Promise<T>) => Promise<T>;
};

/**
 * A timed request whose deadline covers the body as well as the headers.
 *
 * The signal stays attached to the response body after `fetch` resolves, so the timeout has to be
 * cancelled once the body is fully read — otherwise a large object that takes longer than
 * {@link S3_TIMEOUT_MS} to transfer is aborted mid-read, after the caller already has a `Response`
 * in hand. Callers signal completion by calling the returned `done`.
 */
const request = async (input: URL, init: RequestInit & { headers?: Record<string, string> }): Promise<TimedRequest> => {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, S3_TIMEOUT_MS);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return {
      response,
      done: () => clearTimeout(timeout),
      // Body reads happen after `fetch` resolves, so an abort during one lands outside this
      // try/catch and would surface as a native `AbortError`. Route them through here to get the
      // same classification the header phase gets.
      read: async <T>(consume: () => Promise<T>): Promise<T> => {
        try {
          return await consume();
        } catch (cause) {
          throw timedOut ? new S3TimeoutError(input.host, S3_TIMEOUT_MS) : cause;
        }
      },
    };
  } catch (cause) {
    clearTimeout(timeout);
    // A slow endpoint must not be reported as a CORS problem: `S3NetworkError` tells the user to fix
    // a bucket policy, which for a timeout is advice about something that is already correct.
    if (timedOut) {
      throw new S3TimeoutError(input.host, S3_TIMEOUT_MS);
    }
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

  const { response, done, read } = await request(url, { method: 'PUT', headers, body: toArrayBufferView(data) });
  try {
    if (!response.ok) {
      throw new S3RequestError(response.status, response.statusText, await read(() => response.text()).catch(() => ''));
    }
  } finally {
    done();
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
): Promise<TimedRequest> => {
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

/**
 * Reads an object's bytes.
 *
 * Resolves `undefined` when the object is absent, or is not readable with the credentials in hand —
 * see {@link isMiss} for which statuses count. Rejects on a transport failure or an unexpected
 * status, since neither is evidence the object is missing.
 */
export const getObject = async (options: ReadOptions): Promise<Uint8Array | undefined> => {
  const { response, done, read } = await readRequest('GET', options);
  try {
    if (!response.ok) {
      if (isMiss(response.status, !!options.credentials)) {
        return undefined;
      }
      throw new S3RequestError(response.status, response.statusText, await read(() => response.text()).catch(() => ''));
    }

    return new Uint8Array(await read(() => response.arrayBuffer()));
  } finally {
    done();
  }
};

/**
 * Whether an object exists and is readable with the credentials in hand. Same miss semantics as
 * {@link getObject}, and the same rejection on anything that is not evidence of absence.
 */
export const headObject = async (options: ReadOptions): Promise<boolean> => {
  const { response, done, read } = await readRequest('HEAD', options);
  if (!response.ok) {
    try {
      if (isMiss(response.status, !!options.credentials)) {
        return false;
      }
      throw new S3RequestError(response.status, response.statusText, await read(() => response.text()).catch(() => ''));
    } finally {
      done();
    }
  }
  done();

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
