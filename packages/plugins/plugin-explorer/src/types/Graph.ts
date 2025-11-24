//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Filter, Obj, Query, QueryAST, Type } from '@dxos/echo';
import { View, ViewAnnotation } from '@dxos/schema';

const GraphSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  view: Type.Ref(View.View).pipe(Annotation.FormInputAnnotation.set(false)),
  query: Schema.Struct({
    raw: Schema.optional(Schema.String),
    ast: QueryAST.Query,
  }).pipe(Schema.mutable, Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Graph',
    version: '0.2.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);

export interface Graph extends Schema.Schema.Type<typeof GraphSchema> {}
export interface GraphEncoded extends Schema.Schema.Encoded<typeof GraphSchema> {}
export const Graph: Schema.Schema<Graph, GraphEncoded> = GraphSchema;

type MakeProps = Omit<Partial<Obj.MakeProps<typeof Graph>>, 'view'> & {
  view: View.View;
};

/**
 * Make a graph as a view of a data set.
 */
export const make = ({
  name,
  query = { raw: '', ast: Query.select(Filter.nothing()).ast },
  view,
}: MakeProps): Graph => {
  return Obj.make(Graph, { name, view: Type.Ref.make(view), query });
};

//
// V1
//

export const GraphV1 = Schema.Struct({
  name: Schema.optional(Schema.String),
  query: Schema.Struct({
    raw: Schema.optional(Schema.String),
    ast: QueryAST.Query,
  }).pipe(Schema.mutable),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Graph',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
);
