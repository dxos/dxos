//
// Copyright 2023 DXOS.org
//
// @import-as-namespace

import * as Schema from 'effect/Schema';

import { EditorInputMode } from '@dxos/ui-editor';

export const Settings = Schema.mutable(
  Schema.Struct({
    editorInputMode: EditorInputMode,
  }),
);

export type Settings = Schema.Schema.Type<typeof Settings>;
