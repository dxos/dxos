//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Filter, Obj, Query, QueryAST, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';

const GraphSchema = Schema.Struct({
  name: Schema.optional(Schema.String),

  view: Type.Ref(View.View).pipe(FormInputAnnotation.set(false)),

  query: Schema.Struct({
    raw: Schema.optional(Schema.String),
    ast: QueryAST.Query,
  }).pipe(Schema.mutable, FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Graph',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
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
  return Obj.make(Graph, { name, view: Ref.make(view), query });
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
  LabelAnnotation.set(['name']),
);
