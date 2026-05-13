//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { EditorInputMode } from '@dxos/ui-editor/types';

export const Settings = Schema.mutable(
  Schema.Struct({
    editorInputMode: EditorInputMode.annotations({
      title: 'Editor input mode',
      description: 'Choose the keybinding style for the script editor.',
    }),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
