//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Prompt } from '@dxos/blueprints';
import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { LabelAnnotation } from '@dxos/echo/internal';
import { Graph } from '@dxos/plugin-explorer/types';
import { Text } from '@dxos/schema';

export type CellType = 'markdown' | 'script' | 'query' | 'prompt' | 'view';

export const Cell = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  name: Schema.optional(Schema.String),
  // TODO(burdon): Union type.
  source: Schema.optional(Ref.Ref(Text.Text)),
  prompt: Schema.optional(Ref.Ref(Prompt.Prompt)),
  graph: Schema.optional(Ref.Ref(Graph.Graph)),
});

export interface Cell extends Schema.Schema.Type<typeof Cell> {}

export const Notebook = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  cells: Cell.pipe(Schema.Array, FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.notebook',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export type Notebook = Schema.Schema.Type<typeof Notebook>;

export const make = (props: Obj.MakeProps<typeof Notebook> = { cells: [] }): Notebook => Obj.make(Notebook, props);
