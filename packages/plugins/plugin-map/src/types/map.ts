//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { GeoPoint, TypedObject, Ref } from '@dxos/echo-schema';
import { ViewType } from '@dxos/schema';

export class MapType extends TypedObject({ typename: 'dxos.org/type/Map', version: '0.1.0' })({
  name: Schema.optional(Schema.String),
  coordinates: Schema.optional(GeoPoint),
  // Reference to view used to query for map items
  view: Schema.optional(Ref(ViewType)),
}) {}
