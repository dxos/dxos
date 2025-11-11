//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';

const MapSchema = Schema.Struct({
  name: Schema.optional(Schema.String),

  view: Type.Ref(View.View),

  center: Schema.optional(Type.Format.GeoPoint),
  zoom: Schema.optional(Schema.Number),
  // TODO(wittjosiah): Use GeoJSON format for rendering arbitrary data on the map.
  //   e.g., points, lines, polygons, etc.
  coordinates: Schema.Array(Type.Format.GeoPoint).pipe(Schema.mutable, Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Map',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);
export interface Map extends Schema.Schema.Type<typeof MapSchema> {}
export interface MapEncoded extends Schema.Schema.Encoded<typeof MapSchema> {}
export const Map: Schema.Schema<Map, MapEncoded> = MapSchema;

type MakeWithViewProps = Omit<Partial<Obj.MakeProps<typeof Map>>, 'view'> & {
  view: View.View;
};

/**
 * Make a map object.
 */
export const makeWithView = ({ view, ...props }: MakeWithViewProps): Map =>
  Obj.make(Map, { view: Ref.make(view), ...props });

type MakeProps = Partial<Omit<Obj.MakeProps<typeof Map>, 'view'>> & View.MakeFromSpaceProps;

/**
 * Make a map as a view of a data set.
 */
export const make = async ({ name, center, zoom, coordinates, ...props }: MakeProps): Promise<Map> => {
  const { view } = await View.makeFromSpace(props);
  return Obj.make(Map, { name, view: Ref.make(view), center, zoom, coordinates });
};
