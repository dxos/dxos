//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Format, Obj, Ref, Type } from '@dxos/echo';
import { View } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { ViewAnnotation } from '@dxos/schema';

export const Map = Schema.Struct({
  name: Schema.optional(Schema.String),

  view: Ref.Ref(View.View).pipe(FormInputAnnotation.set(false), Schema.optional),

  center: Format.GeoPoint.pipe(FormInputAnnotation.set(false), Schema.optional),
  zoom: Schema.Number.pipe(FormInputAnnotation.set(false), Schema.optional),
  // TODO(wittjosiah): Use GeoJSON format for rendering arbitrary data on the map.
  //   e.g., points, lines, polygons, etc.
  coordinates: Schema.Array(Format.GeoPoint).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.map',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
  Annotation.IconAnnotation.set({
    icon: 'ph--compass--regular',
    hue: 'green',
  }),
);

export interface Map extends Schema.Schema.Type<typeof Map> {}

type MakeProps = Omit<Partial<Obj.MakeProps<typeof Map>>, 'view'> & {
  view?: View.View;
};

/**
 * Make a map as a view of a data set.
 */
export const make = ({ name, center, zoom, coordinates, view }: MakeProps = {}): Map => {
  return Obj.make(Map, {
    name,
    view: view && Ref.make(view),
    center,
    zoom,
    coordinates,
  });
};
