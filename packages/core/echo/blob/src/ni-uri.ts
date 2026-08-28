//
// Copyright 2026 DXOS.org
//

/**
 * IANA hash-algorithm name for SHA-256 in RFC 6920 Named Information URIs.
 *
 * @see https://www.rfc-editor.org/rfc/rfc6920
 */
export const ALG = 'sha-256';

/**
 * URI scheme for Named Information URIs (`ni:`).
 *
 * @see https://www.rfc-editor.org/rfc/rfc6920#section-4
 */
export const SCHEME = 'ni';

const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** RFC 4648 §5 base64url encoding without padding. */
export const toBase64url = (bytes: Uint8Array): string => {
  let out = '';
  for (let offset = 0; offset < bytes.length; offset += 3) {
    const byte0 = bytes[offset];
    const byte1 = bytes[offset + 1];
    const byte2 = bytes[offset + 2];
    out += BASE64URL_ALPHABET[byte0 >> 2];
    out += BASE64URL_ALPHABET[((byte0 & 0x03) << 4) | (byte1 === undefined ? 0 : byte1 >> 4)];
    if (byte1 === undefined) {
      break;
    }
    out += BASE64URL_ALPHABET[((byte1 & 0x0f) << 2) | (byte2 === undefined ? 0 : byte2 >> 6)];
    if (byte2 === undefined) {
      break;
    }
    out += BASE64URL_ALPHABET[byte2 & 0x3f];
  }
  return out;
};

/** RFC 4648 §5 base64url decoding; ignores characters outside the alphabet. */
export const fromBase64url = (value: string): Uint8Array => {
  const lookup = new Int8Array(128).fill(-1);
  for (let index = 0; index < BASE64URL_ALPHABET.length; index++) {
    lookup[BASE64URL_ALPHABET.charCodeAt(index)] = index;
  }

  const out = new Uint8Array((value.length * 3) >> 2);
  let bits = 0;
  let accumulator = 0;
  let position = 0;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= lookup.length) {
      continue;
    }
    const digit = lookup[code];
    if (digit < 0) {
      continue;
    }
    accumulator = (accumulator << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[position++] = (accumulator >> bits) & 0xff;
    }
  }
  return out.subarray(0, position);
};

const hexFromDigest = (digest: Uint8Array): string =>
  Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const digestFromHex = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

/**
 * Computes the raw SHA-256 digest of `bytes`.
 */
export const digestBytes = async (bytes: Uint8Array): Promise<Uint8Array> => {
  // WebCrypto's `BufferSource` type requires an `ArrayBuffer`-backed view, while `Uint8Array` is
  // generic over `ArrayBufferLike` (which also covers `SharedArrayBuffer`) — a real gap between
  // the DOM lib types and the TS standard lib, not fixable by typing `bytes` differently.
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return new Uint8Array(digest);
};

/**
 * Builds an RFC 6920 Named Information URI from a raw SHA-256 digest.
 *
 * @see https://www.rfc-editor.org/rfc/rfc6920#section-3
 */
export const fromDigest = (digest: Uint8Array): string => `ni:///${ALG};${toBase64url(digest)}`;

/**
 * Builds an RFC 6920 Named Information URI from a lowercase hex-encoded SHA-256 digest.
 */
export const fromDigestHex = (hex: string): string => fromDigest(digestFromHex(hex));

/**
 * Computes the RFC 6920 Named Information URI for `bytes` (`ni:///sha-256;<base64url-digest>`).
 *
 * @see https://www.rfc-editor.org/rfc/rfc6920
 */
export const encode = async (bytes: Uint8Array): Promise<string> => fromDigest(await digestBytes(bytes));

/**
 * Extracts the raw SHA-256 digest from a `ni:` URI.
 *
 * @throws If `uri` is not a well-formed `ni:///sha-256;…` URI.
 */
export const decode = (uri: string): Uint8Array => {
  const match = /^ni:\/\/\/([a-z0-9-]+);([A-Za-z0-9_-]+)$/.exec(uri);
  if (!match || match[1] !== ALG) {
    throw new Error(`Invalid ni: URI: ${uri}`);
  }
  return fromBase64url(match[2]);
};

/**
 * Returns the lowercase hex SHA-256 digest encoded in a `ni:` URI.
 */
export const digestHex = (uri: string): string => hexFromDigest(decode(uri));

/**
 * Computes the lowercase hex SHA-256 digest of `bytes`.
 */
export const digestHexFromBytes = async (bytes: Uint8Array): Promise<string> => hexFromDigest(await digestBytes(bytes));
