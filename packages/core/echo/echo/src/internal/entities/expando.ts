//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EchoObjectSchema } from './object';

const ExpandoSchema = Schema.Struct({}, { key: Schema.String, value: Schema.Any }).pipe(
  EchoObjectSchema({
    typename: 'dxos.org/type/Expando',
    version: '0.1.0',
  }),
);

/**
 * Expando object is an object with an arbitrary set of properties.
 */
export interface Expando extends Schema.Schema.Type<typeof ExpandoSchema> {}
export interface ExpandoEncoded extends Schema.Schema.Encoded<typeof ExpandoSchema> {}
export const Expando: Schema.Schema<Expando, ExpandoEncoded> = ExpandoSchema;
