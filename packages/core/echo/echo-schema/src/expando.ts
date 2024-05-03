//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { echoObject } from './annotations';

/**
 * Marker value to be passed to `object` constructor to create an ECHO object with a generated ID.
 */
export const ExpandoMarker = Symbol.for('@dxos/echo-schema/Expando');
const _Expando = S.struct({}, { key: S.string, value: S.any }).pipe(echoObject('Expando', '0.1.0'));
export interface Expando extends S.Schema.Type<typeof _Expando> {}
export const Expando: S.Schema<Expando> & { [ExpandoMarker]: true } = _Expando as any;
