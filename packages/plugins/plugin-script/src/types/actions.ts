//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/client/echo';
import { Script } from '@dxos/functions';

import { meta } from '../meta';
import { templates } from '../templates';

import { Notebook } from './schema';

export namespace ScriptAction {
  export const ScriptProps = Schema.Struct({
    name: Schema.optional(Schema.String),
    // TODO(wittjosiah): Placeholder annotation?
    gistUrl: Schema.optional(Schema.String.annotations({ title: 'Import from Gist (url)' })),
    initialTemplateId: Schema.Literal(...templates.map(({ id }) => id)).pipe(
      Schema.annotations({ title: 'Template' }),
      Schema.optional,
    ),
  });

  export class CreateScript extends Schema.TaggedClass<CreateScript>()(`${meta.id}/action/create-script`, {
    input: Schema.extend(
      ScriptProps,
      Schema.Struct({
        space: SpaceSchema,
      }),
    ),
    output: Schema.Struct({
      object: Script.Script,
    }),
  }) {}

  export const NotebookProps = Schema.Struct({
    name: Schema.optional(Schema.String),
  });

  export class CreateNotebook extends Schema.TaggedClass<CreateNotebook>()(`${meta.id}/action/create-notebook`, {
    input: Schema.extend(
      NotebookProps,
      Schema.Struct({
        space: SpaceSchema,
      }),
    ),
    output: Schema.Struct({
      object: Notebook.Notebook,
    }),
  }) {}
}
