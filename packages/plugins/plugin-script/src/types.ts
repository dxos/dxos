//
// Copyright 2023 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { SpaceSchema } from '@dxos/client/echo';
import { FunctionType, ScriptType } from '@dxos/functions';
import { EditorInputMode } from '@dxos/react-ui-editor';

import { SCRIPT_PLUGIN } from './meta';

// TODO(burdon): Standardize export (e.g., @dxos/plugin-script/meta)?
export { SCRIPT_PLUGIN };

export namespace ScriptAction {
  const SCRIPT_ACTION = `${SCRIPT_PLUGIN}/action`;

  export const CreateScriptSchema = Schema.Struct({
    name: Schema.optional(Schema.String),
    // TODO(wittjosiah): Placeholder annotation?
    gistUrl: Schema.optional(Schema.String.annotations({ [SchemaAST.TitleAnnotationId]: 'Import from Gist (url)' })),
    initialTemplateId: Schema.optional(Schema.String),
  });

  export type CreateScriptProps = Schema.Schema.Type<typeof CreateScriptSchema>;

  export class Create extends Schema.TaggedClass<Create>()(`${SCRIPT_ACTION}/create`, {
    input: Schema.extend(CreateScriptSchema, Schema.Struct({ space: SpaceSchema })),
    output: Schema.Struct({
      object: ScriptType,
    }),
  }) {}

  export class Deploy extends Schema.TaggedClass<Deploy>()(`${SCRIPT_ACTION}/deploy`, {
    input: Schema.Struct({
      object: ScriptType,
    }),
    output: Schema.Struct({
      object: FunctionType,
    }),
  }) {}

  export class Invoke extends Schema.TaggedClass<Invoke>()(`${SCRIPT_ACTION}/invoke`, {
    input: Schema.Struct({
      object: FunctionType,
      // TODO(wittjosiah): Should follow function input schema.
      data: Schema.String,
      space: Schema.optional(SpaceSchema),
    }),
    // TODO(wittjosiah): Should follow function output schema.
    output: Schema.Any,
  }) {}
}

export const ScriptSettingsSchema = Schema.mutable(
  Schema.Struct({
    editorInputMode: EditorInputMode,
  }),
);

export type ScriptSettingsProps = Schema.Schema.Type<typeof ScriptSettingsSchema>;
