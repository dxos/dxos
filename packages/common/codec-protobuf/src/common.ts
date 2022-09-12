//
// Copyright 2020 DXOS.org
//

import type { Schema } from './schema';

export interface SubstitutionDescriptor<T> {
  encode: (value: T, schema: Schema<any>) => any
  decode: (value: any, schema: Schema<any>) => T
}

export type Substitutions = Record<string, SubstitutionDescriptor<any>>

/**
 * Returns a discriminated union of all protobuf types with the '@type' field included.
 */
export type TypedProtoMessage<TYPES extends {}> = {
  [K in keyof TYPES]: TYPES[K] & { '@type': K }
}[keyof TYPES]