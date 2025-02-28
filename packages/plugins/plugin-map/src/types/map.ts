//
// Copyright 2024 DXOS.org
//
import { GeoPoint, S, TypedObject, Ref } from '@dxos/echo-schema';
import { ViewType } from '@dxos/schema';

export class MapType extends TypedObject({ typename: 'dxos.org/type/Map', version: '0.1.0' })({
  name: S.optional(S.String),
  coordinates: S.optional(S.Array(GeoPoint).pipe(S.mutable)),
  // Reference to view used to query for map items
  view: S.optional(Ref(ViewType)),
}) {}
