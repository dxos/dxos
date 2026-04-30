//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { EditorInputMode } from '@dxos/ui-editor/types';

export const Settings = Schema.mutable(
  Schema.Struct({
    editorInputMode: EditorInputMode,
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
