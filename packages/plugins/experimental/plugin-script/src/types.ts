//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { EditorInputMode } from '@dxos/react-ui-editor';

import { SCRIPT_PLUGIN } from './meta';

export namespace ScriptAction {
  const SCRIPT_ACTION = `${SCRIPT_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${SCRIPT_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: ScriptType,
    }),
  }) {}
}

export const ScriptSettingsSchema = S.mutable(
  S.Struct({
    editorInputMode: EditorInputMode,
  }),
);

export type ScriptSettingsProps = S.Schema.Type<typeof ScriptSettingsSchema>;
