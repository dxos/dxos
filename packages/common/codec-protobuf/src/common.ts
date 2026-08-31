//
// Copyright 2020 DXOS.org
//

import { type EncodingOptions } from '@dxos/codec';

import { type TypeMapperContext } from './mapping';
import type { Schema } from './schema';

export interface SubstitutionDescriptor<T> {
  encode: (value: T, context: TypeMapperContext, schema: Schema<any>, options: EncodingOptions) => any;
  decode: (value: any, context: TypeMapperContext, schema: Schema<any>, options: EncodingOptions) => T;
}

export type Substitutions = Record<string, SubstitutionDescriptor<any>>;
