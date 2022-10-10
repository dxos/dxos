//
// Copyright 2020 DXOS.org
//

import type { Schema } from './schema.js';

export interface EncodingOptions {
  /**
   * If enabled, google.protobuf.Any will not be recursively decoded.
   * The field type will be `{ '@type': 'google.protobuf.Any' } & Any`.
   */
  preserveAny?: boolean
}

export interface SubstitutionDescriptor<T> {
  encode: (value: T, schema: Schema<any>, options: EncodingOptions) => any
  decode: (value: any, schema: Schema<any>, options: EncodingOptions) => T
}

export type Substitutions = Record<string, SubstitutionDescriptor<any>>

export interface Any {
  type_url: string
  value: Uint8Array
}

// eslint-disable-next-line camelcase
export type WithTypeUrl<T extends {}> = T & { '@type': string };

export type TaggedType<TYPES extends {}, Name extends keyof TYPES> = TYPES[Name] & { '@type': Name };

/**
 * Returns a discriminated union of all protobuf types with the '@type' field included.
 * Useful for typing 'google.protobuf.Any' messages.
 */
export type TypedProtoMessage<TYPES extends {}> = {
  [K in keyof TYPES]: TYPES[K] & { '@type': K }
}[keyof TYPES];
