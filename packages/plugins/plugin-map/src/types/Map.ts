//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Format, Obj, Ref, Type } from '@dxos/echo';
import { View, ViewAnnotation } from '@dxos/schema';
||||||| 87517e966b
import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation, ViewAnnotation } from '@dxos/echo/internal';
import { View } from '@dxos/schema';
=======
import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';
>>>>>>> origin/main

<<<<<<< HEAD
const MapSchema = Schema.Struct({
||||||| 87517e966b
export const Map = Schema.Struct({
=======
const MapSchema = Schema.Struct({
  name: Schema.optional(Schema.String),

  view: Type.Ref(View.View).pipe(FormInputAnnotation.set(false), Schema.optional),

  center: Type.Format.GeoPoint.pipe(FormInputAnnotation.set(false), Schema.optional),
  zoom: Schema.Number.pipe(FormInputAnnotation.set(false), Schema.optional),
  // TODO(wittjosiah): Use GeoJSON format for rendering arbitrary data on the map.
  //   e.g., points, lines, polygons, etc.
  coordinates: Schema.Array(Type.Format.GeoPoint).pipe(Schema.mutable, FormInputAnnotation.set(false), Schema.optional),
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
>>>>>>> origin/main
  name: Schema.optional(Schema.String),
<<<<<<< HEAD

  view: Type.Ref(View.View).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),

  center: Format.GeoPoint.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  zoom: Schema.Number.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  // TODO(wittjosiah): Use GeoJSON format for rendering arbitrary data on the map.
  //   e.g., points, lines, polygons, etc.
  coordinates: Schema.Array(Format.GeoPoint).pipe(
    Schema.mutable,
    Annotation.FormInputAnnotation.set(false),
    Schema.optional,
  ),
||||||| 87517e966b
  center: Schema.optional(Type.Format.GeoPoint),
  zoom: Schema.optional(Schema.Number),
  // TODO(wittjosiah): Use GeoJSON format for rendering arbitrary data on the map.
  //   e.g., points, lines, polygons, etc.
  coordinates: Schema.Array(Type.Format.GeoPoint).pipe(Schema.mutable, Schema.optional),
=======
  center: Schema.optional(Type.Format.GeoPoint),
  zoom: Schema.optional(Schema.Number),
  coordinates: Schema.Array(Type.Format.GeoPoint).pipe(Schema.mutable, Schema.optional),
>>>>>>> origin/main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Map',
    version: '0.3.0',
  }),
<<<<<<< HEAD
  Annotation.LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
||||||| 87517e966b
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
=======
  LabelAnnotation.set(['name']),
>>>>>>> origin/main
);
<<<<<<< HEAD
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
  Annotation.LabelAnnotation.set(['name']),
);
||||||| 87517e966b

export type Map = Schema.Schema.Type<typeof Map>;

/**
 * Make a map object.
 */
export const make = (props: Obj.MakeProps<typeof Map> = {}) => Obj.make(Map, props);

type MakeViewProps = Omit<View.MakeFromSpaceProps, 'presentation'> & {
  presentation?: Omit<Obj.MakeProps<typeof Map>, 'name'>;
};

/**
 * Make a map as a view of a data set.
 */
export const makeView = async ({ presentation, ...props }: MakeViewProps) => {
  const map = Obj.make(Map, presentation ?? {});
  return View.makeFromSpace({ ...props, presentation: map });
};
=======
>>>>>>> origin/main
