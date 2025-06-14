//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { GeoPoint } from '@dxos/echo-schema';
import { SpaceSchema } from '@dxos/react-client/echo';

import { MapType } from './map';
import { MAP_PLUGIN } from '../meta';

// TODO(burdon): Move to FormatEnum or SDK.
export const TypenameAnnotationId = Symbol.for('@dxos/plugin-map/annotation/Typename');
export const LocationAnnotationId = Symbol.for('@dxos/plugin-map/annotation/Location');

export const CreateMapSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  initialSchema: Schema.optional(
    Schema.String.annotations({
      [TypenameAnnotationId]: true,
      title: 'Schema',
    }),
  ),
  locationProperty: Schema.optional(
    Schema.String.annotations({
      [LocationAnnotationId]: true,
      title: 'Location property',
    }),
  ),
});

export type CreateMapType = Schema.Schema.Type<typeof CreateMapSchema>;

export namespace MapAction {
  const MAP_ACTION = `${MAP_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${MAP_ACTION}/create`, {
    input: Schema.extend(
      Schema.Struct({ space: SpaceSchema, coordinates: Schema.optional(GeoPoint) }),
      CreateMapSchema,
    ),
    output: Schema.Struct({ object: MapType }),
  }) {}

  export class Toggle extends Schema.TaggedClass<Toggle>()(`${MAP_ACTION}/toggle`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}
}
