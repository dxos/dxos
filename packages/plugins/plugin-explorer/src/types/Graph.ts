//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Filter, Obj, Query, QueryAST, Ref, Type, View } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { ViewAnnotation } from '@dxos/schema';

export class Graph extends Type.makeObject<Graph>(DXN.make('org.dxos.type.graph', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    view: Ref.Ref(View.View).pipe(FormInputAnnotation.set(false), Schema.optional),
    query: Schema.Struct({
      raw: Schema.optional(Schema.String),
      ast: QueryAST.Query,
    }).pipe(FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    ViewAnnotation.set(['view']),
    Annotation.IconAnnotation.set({ icon: 'ph--graph--regular', hue: 'green' }),
  ),
) {}

type MakeProps = Omit<Partial<Obj.MakeProps<typeof Graph>>, 'view'> & {
  view?: View.View;
};

/**
 * Make a graph as a view of a data set.
 */
export const make = ({
  name,
  query = { raw: '', ast: Query.select(Filter.nothing()).ast },
  view,
}: MakeProps = {}): Graph => {
  return Obj.make(Graph, { name, view: view && Ref.make(view), query });
};
