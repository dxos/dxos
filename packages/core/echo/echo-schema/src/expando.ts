//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { EchoObject } from './annotations';

export const EXPANDO_TYPENAME = 'dxos.org/type/Expando';

/**
 * Marker value to be passed to `object` constructor to create an ECHO object with a generated ID.
 */
export const ExpandoMarker = Symbol.for('@dxos/echo-schema/Expando');

const ExpandoSchema = S.Struct({}, { key: S.String, value: S.Any }).pipe(EchoObject(EXPANDO_TYPENAME, '0.1.0'));
export interface Expando extends S.Schema.Type<typeof ExpandoSchema> {}
export const Expando: S.Schema<Expando> & { [ExpandoMarker]: true } = ExpandoSchema as any;
