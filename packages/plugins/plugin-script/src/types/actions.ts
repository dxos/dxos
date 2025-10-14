//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/client/echo';
import { ScriptType } from '@dxos/functions';

import { meta } from '../meta';

export namespace ScriptAction {
  export const ScriptProps = Schema.Struct({
    name: Schema.optional(Schema.String),
    // TODO(wittjosiah): Placeholder annotation?
    gistUrl: Schema.optional(Schema.String.annotations({ title: 'Import from Gist (url)' })),
    initialTemplateId: Schema.optional(Schema.String),
  });

  export class CreateScript extends Schema.TaggedClass<CreateScript>()(`${meta.id}/action/create`, {
    input: Schema.extend(
      ScriptProps,
      Schema.Struct({
        space: SpaceSchema,
      }),
    ),
    output: Schema.Struct({
      object: ScriptType,
    }),
  }) {}
}
