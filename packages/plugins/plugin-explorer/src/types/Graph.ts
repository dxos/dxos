//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Filter, Obj, Query, QueryAST, Type } from '@dxos/echo';
import { LabelAnnotation, ViewAnnotation } from '@dxos/echo-schema';
import { type CreateViewFromSpaceProps, createViewFromSpace } from '@dxos/schema';

export const Graph = Schema.Struct({
  name: Schema.optional(Schema.String),
  query: Schema.Struct({
    string: Schema.optional(Schema.String),
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
export type Graph = Schema.Schema.Type<typeof Graph>;

/**
 * Make a graph object.
 */
export const make = (
  props: Obj.MakeProps<typeof Graph> = { query: { string: '', ast: Query.select(Filter.nothing()).ast } },
) => Obj.make(Graph, props);

type MakeViewProps = Omit<CreateViewFromSpaceProps, 'presentation'> & {
  presentation?: Omit<Obj.MakeProps<typeof Graph>, 'name'>;
};

/**
 * Make a graph as a view of a data set.
 */
export const makeView = async ({ presentation, ...props }: MakeViewProps) => {
  const graph = make(presentation);
  return createViewFromSpace({ ...props, presentation: graph });
};
