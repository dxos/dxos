//
// Copyright 2026 DXOS.org
//

/**
 * AWS Signature Version 4 for S3-compatible endpoints, over WebCrypto.
 *
 * Hand-rolled rather than taken from `@aws-sdk/*`: the SDK's signer pulls in a credential-provider
 * chain, a region resolver and a Node crypto shim, none of which apply to a browser holding one
 * static key pair — and it is two orders of magnitude larger than the ~150 lines the algorithm needs.
 */

const ALGORITHM = 'AWS4-HMAC-SHA256';
const SERVICE = 's3';
const TERMINATOR = 'aws4_request';

/** Payload hash S3 accepts in place of a real digest when the body is not signed (presigned URLs). */
export const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

/** SHA-256 of the empty string; the payload hash for every request with no body. */
export const EMPTY_PAYLOAD_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

/**
 * Narrows a view to one backed by a plain `ArrayBuffer`. `Uint8Array` is generic over
 * `ArrayBufferLike`, which includes `SharedArrayBuffer`; WebCrypto and `fetch` accept only the
 * former. The common case aliases the existing buffer, so this costs nothing but a wrapper.
 */
export const toArrayBufferView = (data: Uint8Array): Uint8Array<ArrayBuffer> =>
  data.buffer instanceof ArrayBuffer
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : new Uint8Array(data);

export const sha256Hex = async (data: Uint8Array | string): Promise<string> => {
  const bytes = typeof data === 'string' ? encoder.encode(data) : toArrayBufferView(data);
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
};

const hmac = async (key: Uint8Array<ArrayBuffer>, message: string): Promise<Uint8Array<ArrayBuffer>> => {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
};

/**
 * RFC 3986 percent-encoding. `encodeURIComponent` leaves `!'()*` unescaped, which AWS treats as a
 * signature mismatch rather than an equivalent encoding.
 */
export const uriEncode = (value: string): string =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/** Encodes an object key for the canonical URI: every segment escaped, the separating slashes kept. */
export const encodeObjectKey = (key: string): string => key.split('/').map(uriEncode).join('/');

/** `20260826T143000Z` and `20260826` — the two timestamp forms SigV4 uses. */
export const formatTimestamps = (date: Date): { amzDate: string; dateStamp: string } => {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
};

const canonicalQuery = (params: URLSearchParams): string =>
  [...params.entries()]
    .map(([key, value]) => [uriEncode(key), uriEncode(value)] as const)
    // Sort on the encoded forms: AWS orders by byte value after encoding, not before.
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? (leftValue < rightValue ? -1 : 1) : leftKey < rightKey ? -1 : 1,
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

const canonicalHeaders = (headers: Record<string, string>) => {
  const normalized = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort(([left], [right]) => (left < right ? -1 : 1));

  return {
    canonical: normalized.map(([name, value]) => `${name}:${value}\n`).join(''),
    signed: normalized.map(([name]) => name).join(';'),
  };
};

export type SigningCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

const signingKey = async (
  { secretAccessKey, region }: SigningCredentials,
  dateStamp: string,
): Promise<Uint8Array<ArrayBuffer>> => {
  const dateKey = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, SERVICE);
  return hmac(serviceKey, TERMINATOR);
};

const sign = async (
  credentials: SigningCredentials,
  dateStamp: string,
  amzDate: string,
  canonicalRequest: string,
): Promise<{ signature: string; scope: string }> => {
  const scope = `${dateStamp}/${credentials.region}/${SERVICE}/${TERMINATOR}`;
  const stringToSign = [ALGORITHM, amzDate, scope, await sha256Hex(canonicalRequest)].join('\n');
  const signature = toHex(await hmac(await signingKey(credentials, dateStamp), stringToSign));
  return { signature, scope };
};

export type SignRequestOptions = {
  method: string;
  url: URL;
  headers?: Record<string, string>;
  /** Hex SHA-256 of the body, or {@link UNSIGNED_PAYLOAD}. Defaults to the empty-body digest. */
  payloadHash?: string;
  credentials: SigningCredentials;
  date: Date;
};

/**
 * Signs a request with an `Authorization` header. Returns the headers to send — the caller's
 * `headers` plus `host`, `x-amz-date`, `x-amz-content-sha256` and `Authorization`.
 */
export const signRequest = async ({
  method,
  url,
  headers = {},
  payloadHash = EMPTY_PAYLOAD_HASH,
  credentials,
  date,
}: SignRequestOptions): Promise<Record<string, string>> => {
  const { amzDate, dateStamp } = formatTimestamps(date);
  const signedHeaderSet: Record<string, string> = {
    ...headers,
    'host': url.host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  };

  const { canonical, signed } = canonicalHeaders(signedHeaderSet);
  const canonicalRequest = [
    method,
    encodeObjectKey(decodeURIComponent(url.pathname)),
    canonicalQuery(url.searchParams),
    canonical,
    signed,
    payloadHash,
  ].join('\n');

  const { signature, scope } = await sign(credentials, dateStamp, amzDate, canonicalRequest);
  return {
    ...signedHeaderSet,
    Authorization: `${ALGORITHM} Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
  };
};

export type PresignOptions = {
  method?: string;
  url: URL;
  expiresIn: number;
  credentials: SigningCredentials;
  date: Date;
};

/**
 * Produces a URL carrying its own authorization in the query string, so it can be handed to an
 * `<img>` or `<video>` element that cannot send an `Authorization` header.
 */
export const presignUrl = async ({
  method = 'GET',
  url,
  expiresIn,
  credentials,
  date,
}: PresignOptions): Promise<string> => {
  const { amzDate, dateStamp } = formatTimestamps(date);
  const scope = `${dateStamp}/${credentials.region}/${SERVICE}/${TERMINATOR}`;

  const signedUrl = new URL(url.toString());
  signedUrl.searchParams.set('X-Amz-Algorithm', ALGORITHM);
  signedUrl.searchParams.set('X-Amz-Credential', `${credentials.accessKeyId}/${scope}`);
  signedUrl.searchParams.set('X-Amz-Date', amzDate);
  signedUrl.searchParams.set('X-Amz-Expires', String(expiresIn));
  signedUrl.searchParams.set('X-Amz-SignedHeaders', 'host');

  const canonicalRequest = [
    method,
    encodeObjectKey(decodeURIComponent(signedUrl.pathname)),
    canonicalQuery(signedUrl.searchParams),
    `host:${signedUrl.host}\n`,
    'host',
    UNSIGNED_PAYLOAD,
  ].join('\n');

  const { signature } = await sign(credentials, dateStamp, amzDate, canonicalRequest);
  signedUrl.searchParams.set('X-Amz-Signature', signature);
  return signedUrl.toString();
};
