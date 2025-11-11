//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Filter, Obj, Query, QueryAST, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';
import { type MakeOptional } from '@dxos/util';

const GraphSchema = Schema.Struct({
  name: Schema.optional(Schema.String),

  view: Type.Ref(View.View),

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
  ViewAnnotation.set(true),
);
export interface Graph extends Schema.Schema.Type<typeof GraphSchema> {}
export interface GraphEncoded extends Schema.Schema.Encoded<typeof GraphSchema> {}
export const Graph: Schema.Schema<Graph, GraphEncoded> = GraphSchema;

/**
 * Make a graph object.
 */
export const makeWithView = (props: MakeOptional<Obj.MakeProps<typeof Graph>, 'query'>) =>
  Obj.make(Graph, { query: { raw: '', ast: Query.select(Filter.nothing()).ast }, ...props });

type MakeProps = Partial<Omit<Obj.MakeProps<typeof Graph>, 'view'>> & View.MakeFromSpaceProps;

/**
 * Make a graph as a view of a data set.
 */
export const make = async ({ name, query, ...props }: MakeProps): Promise<Graph> => {
  const { view } = await View.makeFromSpace(props);
  return makeWithView({ name, view: Ref.make(view), query });
};
