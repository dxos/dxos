//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';

const MapSchema = Schema.Struct({
  name: Schema.optional(Schema.String),

  view: Type.Ref(View.View).pipe(FormInputAnnotation.set(false), Schema.optional),

  center: Format.GeoPoint.pipe(FormInputAnnotation.set(false), Schema.optional),
  zoom: Schema.Number.pipe(FormInputAnnotation.set(false), Schema.optional),
  // TODO(wittjosiah): Use GeoJSON format for rendering arbitrary data on the map.
  //   e.g., points, lines, polygons, etc.
  coordinates: Schema.Array(Format.GeoPoint).pipe(Schema.mutable, FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Map',
    version: '0.3.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);
export interface Map extends Schema.Schema.Type<typeof MapSchema> {}
export interface MapEncoded extends Schema.Schema.Encoded<typeof MapSchema> {}
export const Map: Schema.Schema<Map, MapEncoded> = MapSchema;

type MakeProps = Omit<Partial<Obj.MakeProps<typeof Map>>, 'view'> & {
  view?: View.View;
};

/**
 * Make a map as a view of a data set.
 */
export const make = ({ name, center, zoom, coordinates, view }: MakeProps): Map => {
  return Obj.make(Map, {
    name,
    view: view && Ref.make(view),
    center,
    zoom,
    coordinates,
  });
};

//
// V2
//

export const MapV2 = Schema.Struct({
  name: Schema.optional(Schema.String),
  center: Schema.optional(Format.GeoPoint),
  zoom: Schema.optional(Schema.Number),
  coordinates: Schema.Array(Format.GeoPoint).pipe(Schema.mutable, Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Map',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
);
