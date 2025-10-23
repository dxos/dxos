//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { Assistant } from '@dxos/plugin-assistant/types';
import { EditorInputMode } from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

export namespace Notebook {
  export type CellType = 'markdown' | 'script' | 'query' | 'prompt' | 'view';

  export const Cell = Schema.Struct({
    id: Schema.String,
    type: Schema.String,
    name: Schema.optional(Schema.String),
    script: Schema.optional(Type.Ref(DataType.Text)),
    view: Schema.optional(Type.Ref(DataType.View)),
    chat: Schema.optional(Type.Ref(Assistant.Chat)),
  }).pipe(Schema.mutable);

  export type Cell = Schema.Schema.Type<typeof Cell>;

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
