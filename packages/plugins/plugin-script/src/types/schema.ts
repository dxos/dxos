//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/client/echo';
import { ScriptType } from '@dxos/functions';
import { EditorInputMode } from '@dxos/react-ui-editor';

import { meta } from '../meta';

export namespace ScriptAction {
  export const CreateScriptSchema = Schema.Struct({
    name: Schema.optional(Schema.String),
    // TODO(wittjosiah): Placeholder annotation?
    gistUrl: Schema.optional(Schema.String.annotations({ title: 'Import from Gist (url)' })),
    initialTemplateId: Schema.optional(Schema.String),
  });

  export type CreateScriptProps = Schema.Schema.Type<typeof CreateScriptSchema>;

  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
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
