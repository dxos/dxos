//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { EditorInputMode } from '@dxos/react-ui-editor';

export namespace Notebook {
  export const Notebook = Schema.mutable(
    Schema.Struct({
      name: Schema.optional(Schema.String),
      scripts: Schema.mutable(Schema.Array(ScriptType)),
    }),
  ).pipe(
    Type.Obj({
      typename: 'dxos.org/type/Notebook',
      version: '0.1.0',
    }),
    LabelAnnotation.set(['name']),
  );

  export type Notebook = Schema.Schema.Type<typeof Notebook>;

  export const make = (props: Obj.MakeProps<typeof Notebook> = { scripts: [] }) => Obj.make(Notebook, props);
}

export const ScriptSettings = Schema.mutable(
  Schema.Struct({
    editorInputMode: EditorInputMode,
  }),
);

export type ScriptSettings = Schema.Schema.Type<typeof ScriptSettings>;
