//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { EchoObject } from '../ast';

export const EXPANDO_TYPENAME = 'dxos.org/type/Expando';

/**
 * Marker value to be passed to `object` constructor to create an ECHO object with a generated ID.
 */
export const ExpandoMarker = Symbol.for('@dxos/schema/Expando');

const ExpandoSchema = S.Struct({}, { key: S.String, value: S.Any }).pipe(
  EchoObject({ typename: EXPANDO_TYPENAME, version: '0.1.0' }),
);

export interface Expando extends S.Schema.Type<typeof ExpandoSchema> {}

export const Expando: S.Schema<Expando> & { [ExpandoMarker]: true } = ExpandoSchema as any;
