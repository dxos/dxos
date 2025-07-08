//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

export class MapType extends TypedObject({
  typename: 'dxos.org/type/Map',
  version: '0.1.0',
})({
  name: Schema.optional(Schema.String),
  coordinates: Schema.optional(Type.Format.GeoPoint),
  // Reference to view used to query for map items
  view: Schema.optional(Type.Ref(DataType.Projection)),
}) {}
