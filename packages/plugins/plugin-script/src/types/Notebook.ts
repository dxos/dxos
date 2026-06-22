//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Instructions } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { Graph } from '@dxos/plugin-explorer';
import { Text } from '@dxos/schema';

export type CellType = 'markdown' | 'script' | 'query' | 'prompt' | 'view';

export const Cell = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  name: Schema.optional(Schema.String),
  // TODO(burdon): Union type.
  source: Schema.optional(Ref.Ref(Text.Text)),
  prompt: Schema.optional(Ref.Ref(Instructions.Instructions)),
  graph: Schema.optional(Ref.Ref(Graph.Graph)),
});

export type Cell = Schema.Schema.Type<typeof Cell>;

export const Notebook = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  cells: Cell.pipe(Schema.Array, FormInputAnnotation.set(false)),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--notebook--regular', hue: 'sky' }),
  Type.makeObject(DXN.make('org.dxos.type.notebook', '0.1.0')),
);

export type Notebook = Type.InstanceType<typeof Notebook>;

export const make = (props: Obj.MakeProps<typeof Notebook> = { cells: [] }): Notebook => Obj.make(Notebook, props);
