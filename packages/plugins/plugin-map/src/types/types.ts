//
// Copyright 2025 DXOS.org
//

import { GeoPoint, S, AST } from '@dxos/echo-schema';
import { SpaceSchema } from '@dxos/react-client/echo';
import { type LatLngLiteral } from '@dxos/react-ui-geo';

import { MapType } from './map';
import { MAP_PLUGIN } from '../meta';

export const InitialSchemaAnnotationId = Symbol.for('@dxos/plugin-map/annotation/InitialSchema');
export const LocationPropertyAnnotationId = Symbol.for('@dxos/plugin-map/annotation/LocationProperty');

// Create schema for map creation
export const CreateMapSchema = S.Struct({
  name: S.optional(S.String),
  initialSchema: S.optional(
    S.String.annotations({
      [InitialSchemaAnnotationId]: true,
      [AST.TitleAnnotationId]: 'Schema',
    }),
  ),
  locationProperty: S.optional(
    S.String.annotations({
      [LocationPropertyAnnotationId]: true,
      [AST.TitleAnnotationId]: 'Location property',
    }),
  ),
});

export type CreateMapType = S.Schema.Type<typeof CreateMapSchema>;

export namespace MapAction {
  const MAP_ACTION = `${MAP_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${MAP_ACTION}/create`, {
    input: S.extend(S.Struct({ space: SpaceSchema, coordinates: S.optional(GeoPoint) }), CreateMapSchema),
    output: S.Struct({ object: MapType }),
  }) {}

  export class Toggle extends S.TaggedClass<Toggle>()(`${MAP_ACTION}/toggle`, {
    input: S.Void,
    output: S.Void,
  }) {}
}

// TODO(burdonn): Move to react-ui-geo
export type MapMarker = {
  id: string;
  title?: string;
  location: LatLngLiteral;
};
