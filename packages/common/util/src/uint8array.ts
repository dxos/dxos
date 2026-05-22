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
 * Marker key used to represent a `Uint8Array` in JSON.
 * Mirrors the `'/'` convention used by encoded references.
 */
export const UINT8ARRAY_JSON_KEY = '/uint8array';

/**
 * JSON-safe representation of a `Uint8Array`.
 * The bytes are encoded as a base64 string under the {@link UINT8ARRAY_JSON_KEY} marker.
 */
export type EncodedUint8Array = { [UINT8ARRAY_JSON_KEY]: string };

export const encodeUint8ArrayToJson = (bytes: Uint8Array): EncodedUint8Array => ({
  [UINT8ARRAY_JSON_KEY]: arrayToBuffer(bytes).toString('base64'),
});

export const isEncodedUint8Array = (value: unknown): value is EncodedUint8Array =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as any)[UINT8ARRAY_JSON_KEY] === 'string' &&
  Object.keys(value).length === 1;

export const decodeUint8ArrayFromJson = (encoded: EncodedUint8Array): Uint8Array =>
  bufferToArray(Buffer.from(encoded[UINT8ARRAY_JSON_KEY], 'base64'));
