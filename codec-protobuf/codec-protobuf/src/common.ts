//
// Copyright 2020 DXOS.org
//

import { Schema } from './codec';

export interface SubstitutionDescriptor<T> {
  encode: (value: T, schema: Schema<any>) => any,
  decode: (value: any, schema: Schema<any>) => T,
}

export type Substitutions = Record<string, SubstitutionDescriptor<any>>
