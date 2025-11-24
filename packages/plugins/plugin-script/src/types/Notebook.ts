//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Prompt } from '@dxos/blueprints';
<<<<<<< HEAD
import { Annotation, Obj, Type } from '@dxos/echo';
import { Text, View } from '@dxos/schema';
||||||| 87517e966b
import { Obj, Type } from '@dxos/echo';
import { FormAnnotation } from '@dxos/echo/internal';
import { LabelAnnotation } from '@dxos/echo/internal';
import { Text, View } from '@dxos/schema';
=======
import { Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { LabelAnnotation } from '@dxos/echo/internal';
import { Graph } from '@dxos/plugin-explorer/types';
import { Text } from '@dxos/schema';
>>>>>>> main

export type CellType = 'markdown' | 'script' | 'query' | 'prompt' | 'view';

const Cell_ = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  name: Schema.optional(Schema.String),
  // TODO(burdon): Union type.
  source: Schema.optional(Type.Ref(Text.Text)),
  prompt: Schema.optional(Type.Ref(Prompt.Prompt)),
  graph: Schema.optional(Type.Ref(Graph.Graph)),
}).pipe(Schema.mutable);
export interface Cell extends Schema.Schema.Type<typeof Cell_> {}
export interface Cell_Encoded extends Schema.Schema.Encoded<typeof Cell_> {}
export const Cell: Schema.Schema<Cell, Cell_Encoded> = Cell_;

export const Notebook = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
<<<<<<< HEAD
  cells: Cell.pipe(Schema.Array, Schema.mutable, Annotation.FormAnnotation.set(false)),
||||||| 87517e966b
  cells: Cell.pipe(Schema.Array, Schema.mutable, FormAnnotation.set(false)),
=======
  cells: Cell.pipe(Schema.Array, Schema.mutable, FormInputAnnotation.set(false)),
>>>>>>> main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Notebook',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
);

export type Notebook = Schema.Schema.Type<typeof Notebook>;

export const make = (props: Obj.MakeProps<typeof Notebook> = { cells: [] }) => Obj.make(Notebook, props);
