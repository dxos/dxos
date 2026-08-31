//
// Copyright 2020 DXOS.org
//

/** Options a caller passes per encode/decode. */
export interface EncodingOptions {
  /**
   * If enabled, google.protobuf.Any will not be recursively decoded.
   * The field type will be `{ '@type': 'google.protobuf.Any' } & Any`.
   */
  preserveAny?: boolean;
}

/**
 * Defines a generic encoder/decoder.
 */
export interface Codec<T> {
  encode(obj: T, opts?: EncodingOptions): Uint8Array;
  decode(buffer: Uint8Array, opts?: EncodingOptions): T;
}

/** The `google.protobuf.Any` envelope as it appears on the wire. */
export interface Any {
  type_url: string;
  value: Uint8Array;
}

/** A JSON object, as `google.protobuf.Struct` decodes to. */
export type Struct = Record<string, any>;

// eslint-disable-next-line camelcase
export type WithTypeUrl<T extends {}> = T & { '@type': string };

export type TaggedType<TYPES extends {}, Name extends keyof TYPES> = TYPES[Name] & { '@type': Name };

/**
 * Returns a discriminated union of all protobuf types with the '@type' field included.
 * Useful for typing 'google.protobuf.Any' messages.
 */
export type TypedProtoMessage<TYPES extends {}> = {
  [K in keyof TYPES]: TYPES[K] & { '@type': K };
}[keyof TYPES];
