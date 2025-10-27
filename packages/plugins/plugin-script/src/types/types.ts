//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EditorInputMode } from '@dxos/react-ui-editor';

export const ScriptSettings = Schema.mutable(
  Schema.Struct({
    editorInputMode: EditorInputMode,
  }),
);

export type ScriptSettings = Schema.Schema.Type<typeof ScriptSettings>;
