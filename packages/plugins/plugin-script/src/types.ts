//
// Copyright 2023 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { SpaceSchema } from '@dxos/client/echo';
import { ScriptType } from '@dxos/functions';
import { EditorInputMode } from '@dxos/react-ui-editor';

import { SCRIPT_PLUGIN } from './meta';

// TODO(burdon): Standardize export (e.g., @dxos/plugin-script/meta)?
export { SCRIPT_PLUGIN };

export namespace ScriptAction {
  const SCRIPT_ACTION = `${SCRIPT_PLUGIN}/action`;

  export const CreateScriptSchema = Schema.Struct({
    name: Schema.optional(Schema.String),
    // TODO(wittjosiah): Placeholder annotation?
    gistUrl: Schema.optional(Schema.String.annotations({ title: 'Import from Gist (url)' })),
    initialTemplateId: Schema.optional(Schema.String),
  });

  export type CreateScriptProps = Schema.Schema.Type<typeof CreateScriptSchema>;

  export class Create extends Schema.TaggedClass<Create>()(`${SCRIPT_ACTION}/create`, {
    input: Schema.extend(CreateScriptSchema, Schema.Struct({ space: SpaceSchema })),
    output: Schema.Struct({
      object: ScriptType,
    }),
  }) {}
}

export const ScriptSettingsSchema = Schema.mutable(
  Schema.Struct({
    editorInputMode: EditorInputMode,
  }),
);

export type ScriptSettingsProps = Schema.Schema.Type<typeof ScriptSettingsSchema>;
