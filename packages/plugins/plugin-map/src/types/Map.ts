//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

// QueryAST is referenced indirectly through the `Map` class type
// (Ref.Ref(View.View) → View.View → QueryAST.Query) in the emitted .d.ts; the
// namespace import keeps the inferred types portable.
// eslint-disable-next-line unused-imports/no-unused-imports
import { DXN, Annotation, Format, Obj, QueryAST, Ref, Type, View } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { ViewAnnotation } from '@dxos/schema';

export class Map extends Type.makeObject<Map>(DXN.make('org.dxos.type.map', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    view: Ref.Ref(View.View).pipe(FormInputAnnotation.set(false), Schema.optional),
    center: Format.GeoPoint.pipe(FormInputAnnotation.set(false), Schema.optional),
    zoom: Schema.Number.pipe(FormInputAnnotation.set(false), Schema.optional),
    // TODO(wittjosiah): Use GeoJSON format for rendering arbitrary data on the map.
    //   e.g., points, lines, polygons, etc.
    coordinates: Schema.Array(Format.GeoPoint).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    LabelAnnotation.set(['name']),
    ViewAnnotation.set(['view']),
    Annotation.IconAnnotation.set({ icon: 'ph--compass--regular', hue: 'green' }),
  ),
) {}

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
