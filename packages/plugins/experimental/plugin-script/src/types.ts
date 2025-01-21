//
// Copyright 2023 DXOS.org
//

import { TitleAnnotationId } from '@effect/schema/AST';

import { SpaceSchema } from '@dxos/client/echo';
import { S } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';

import { SCRIPT_PLUGIN } from './meta';

export namespace ScriptAction {
  const SCRIPT_ACTION = `${SCRIPT_PLUGIN}/action`;

  export const CreateScriptSchema = S.Struct({
    name: S.optional(S.String),
    // TODO(wittjosiah): Placeholder annotation?
    gistUrl: S.optional(S.String.annotations({ [TitleAnnotationId]: 'Import from Gist (url)' })),
  });

  export type CreateScriptProps = S.Schema.Type<typeof CreateScriptSchema>;

  export class Create extends S.TaggedClass<Create>()(`${SCRIPT_ACTION}/create`, {
    input: S.extend(CreateScriptSchema, S.Struct({ space: SpaceSchema })),
    output: S.Struct({
      object: ScriptType,
    }),
  }) {}
}

export type ScriptSettingsProps = {};
