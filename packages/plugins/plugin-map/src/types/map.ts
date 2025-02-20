//
// Copyright 2024 DXOS.org
//

import { GeoPoint, S, TypedObject } from '@dxos/echo-schema';

export class MapType extends TypedObject({ typename: 'dxos.org/type/Map', version: '0.1.0' })({
  name: S.optional(S.String),
  coordinates: S.optional(GeoPoint),
}) {}
