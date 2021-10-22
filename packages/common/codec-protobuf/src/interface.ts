export interface Codec<T> {
  encode(value: T): Uint8Array
  decode(data: Uint8Array): T
}

/**
 * Codec for Uint8Array instances that just passes the values through.
 */
export const NOOP_CODEC: Codec<Uint8Array> = {
  encode: (value: Uint8Array) => value,
  decode: (data: Uint8Array) => data
};
