//
// Copyright 2021 DXOS.org
//

export const arraysEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
};

/**
 * Non-copying conversion of Uint8Array to Buffer.
 * The resulting buffer will share the same allocated memory as the Uint8Array.
 */
export const arrayToBuffer = (array: Uint8Array): Buffer => {
  return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
};

/**
 * Non-copying conversion of Buffer to Uint8Array.
 * The resulting Uint8Array will share the same allocated memory as the Buffer.
 */
export const bufferToArray = (buffer: Buffer): Uint8Array => {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

export const stringToArray = (string: string): Uint8Array => bufferToArray(Buffer.from(string, 'hex'));

export const arrayToString = (array: Uint8Array): string => arrayToBuffer(array).toString('hex');

/**
 * JSON-safe representation of a `Uint8Array`, per the IPLD DAG-JSON spec.
 * https://ipld.io/specs/codecs/dag-json/spec/#bytes
 *
 * Bytes are encoded as `{ "/": { "bytes": "<base64-no-padding>" } }`.
 * Distinguishable from encoded references `{ "/": "<string>" }` by the type of the `/` value.
 */
export type EncodedUint8Array = { '/': { bytes: string } };

const toUnpaddedBase64 = (bytes: Uint8Array): string => arrayToBuffer(bytes).toString('base64').replace(/=+$/, '');

/**
 * Encode a `Uint8Array` as the DAG-JSON bytes form `{ '/': { bytes: '<base64-no-padding>' } }`.
 */
export const encodeUint8ArrayToJson = (bytes: Uint8Array): EncodedUint8Array => ({
  '/': { bytes: toUnpaddedBase64(bytes) },
});

/**
 * Type-guard that returns true iff `value` is the DAG-JSON bytes form produced by
 * {@link encodeUint8ArrayToJson} — an object with exactly one key `'/'` whose value is an
 * object with exactly one string key `bytes`.
 */
export const isEncodedUint8Array = (value: unknown): value is EncodedUint8Array => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  if (Object.keys(value).length !== 1) {
    return false;
  }
  const inner = (value as any)['/'];
  if (typeof inner !== 'object' || inner === null || Array.isArray(inner)) {
    return false;
  }
  return Object.keys(inner).length === 1 && typeof inner.bytes === 'string';
};

/**
 * Decode a DAG-JSON bytes form (as produced by {@link encodeUint8ArrayToJson}) back to a
 * `Uint8Array`. The base64 string is tolerated with or without padding.
 */
export const decodeUint8ArrayFromJson = (encoded: EncodedUint8Array): Uint8Array =>
  bufferToArray(Buffer.from(encoded['/'].bytes, 'base64'));
