//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { EditorInputMode } from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

export namespace Notebook {
  export const Cell = Schema.Struct({
    id: Schema.String,
    script: Type.Ref(DataType.Text),
  });

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
