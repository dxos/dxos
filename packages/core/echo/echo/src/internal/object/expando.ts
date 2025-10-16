//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EchoObject } from './entity';

export const EXPANDO_TYPENAME = 'dxos.org/type/Expando';

const ExpandoSchema = Schema.Struct({}, { key: Schema.String, value: Schema.Any }).pipe(
  EchoObject({ typename: EXPANDO_TYPENAME, version: '0.1.0' }),
);

/**
 * Expando object is an object with an arbitrary set of properties.
 */
// TODO(dmaretskyi): Can we consider expando a top-type, i.e. have a ref to expando potentially be a valid ref to any object?
export interface Expando extends Schema.Schema.Type<typeof ExpandoSchema> {}

export const Expando: Schema.Schema<Expando> = ExpandoSchema;
