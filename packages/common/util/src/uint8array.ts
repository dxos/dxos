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
export const arrayToBuffer = (array: Uint8Array): Buffer =>
  Buffer.from(array.buffer, array.byteOffset, array.byteLength);

/**
 * Non-copying conversion of Buffer to Uint8Array.
 * The resulting Uint8Array will share the same allocated memory as the Buffer.
 */
export const bufferToArray = (buffer: Buffer): Uint8Array =>
  new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

export const stringToArray = (string: string): Uint8Array => bufferToArray(Buffer.from(string, 'hex'));

export const arrayToString = (array: Uint8Array): string => arrayToBuffer(array).toString('hex');
