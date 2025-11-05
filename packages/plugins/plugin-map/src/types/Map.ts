//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation, ViewAnnotation } from '@dxos/echo/internal';
import { DataType } from '@dxos/schema';

export const Map = Schema.Struct({
  name: Schema.optional(Schema.String),
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

export type Map = Schema.Schema.Type<typeof Map>;

/**
 * Make a map object.
 */
export const make = (props: Obj.MakeProps<typeof Map> = {}) => Obj.make(Map, props);

type MakeViewProps = Omit<DataType.View.MakeFromSpaceProps, 'presentation'> & {
  presentation?: Omit<Obj.MakeProps<typeof Map>, 'name'>;
};

/**
 * Make a map as a view of a data set.
 */
export const makeView = async ({ presentation, ...props }: MakeViewProps) => {
  const map = Obj.make(Map, presentation ?? {});
  return DataType.View.makeFromSpace({ ...props, presentation: map });
};
