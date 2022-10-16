//
// Copyright 2021 DXOS.org
//

/**
 * Protocol buffer codec.
 */
export interface Codec<T> {
  encode(obj: T): Uint8Array
  decode(buffer: Uint8Array): T
}

/**
 * Codec for Uint8Array instances that just passes the values through.
 */
export const NOOP_CODEC: Codec<Uint8Array> = {
  encode: (obj: Uint8Array) => obj,
  decode: (buffer: Uint8Array) => buffer
};
