//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { EditorInputMode } from '@dxos/ui-editor/types';

export const Settings = Schema.Struct({
  editorInputMode: EditorInputMode.annotate({
    title: 'Editor input mode',
    description: 'Choose the keybinding style for the script editor.',
  }),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
