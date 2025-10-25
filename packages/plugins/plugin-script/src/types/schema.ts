//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Prompt } from '@dxos/blueprints';
import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { EditorInputMode } from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

export namespace Notebook {
  export type CellType = 'markdown' | 'script' | 'query' | 'prompt' | 'view';

  const Cell_ = Schema.Struct({
    id: Schema.String,
    type: Schema.String,
    name: Schema.optional(Schema.String),
    // TODO(burdon): Union type.
    source: Schema.optional(Type.Ref(DataType.Text)),
    prompt: Schema.optional(Type.Ref(Prompt.Prompt)),
    view: Schema.optional(Type.Ref(DataType.View)),
  }).pipe(Schema.mutable);
  export interface Cell extends Schema.Schema.Type<typeof Cell_> {}
  export interface Cell_Encoded extends Schema.Schema.Encoded<typeof Cell_> {}
  export const Cell: Schema.Schema<Cell, Cell_Encoded> = Cell_;

  export const Notebook = Schema.Struct({
    name: Schema.optional(Schema.String),
    cells: Schema.mutable(Schema.Array(Cell)),
  }).pipe(
    Type.Obj({
      typename: 'dxos.org/type/Notebook',
      version: '0.1.0',
    }),
    LabelAnnotation.set(['name']),
  );

  export type Notebook = Schema.Schema.Type<typeof Notebook>;

  export const make = (props: Obj.MakeProps<typeof Notebook> = { cells: [] }) => Obj.make(Notebook, props);
}

export const ScriptSettings = Schema.mutable(
  Schema.Struct({
    editorInputMode: EditorInputMode,
  }),
);

export type ScriptSettings = Schema.Schema.Type<typeof ScriptSettings>;
