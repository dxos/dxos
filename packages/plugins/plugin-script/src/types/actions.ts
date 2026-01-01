//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { Script } from '@dxos/functions';
import * as Operation from '@dxos/operation';

import { meta } from '../meta';
import { templates } from '../templates';

import * as Notebook from './Notebook';

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
        db: Database.Database,
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
        db: Database.Database,
      }),
    ),
    output: Schema.Struct({
      object: Notebook.Notebook,
    }),
  }) {}
}

const SCRIPT_OPERATION = `${meta.id}/operation`;

export namespace ScriptOperation {
  export const CreateScript = Operation.make({
    meta: { key: `${SCRIPT_OPERATION}/create-script`, name: 'Create Script' },
    schema: {
      input: Schema.extend(
        ScriptAction.ScriptProps,
        Schema.Struct({
          db: Database.Database,
        }),
      ),
      output: Schema.Struct({
        object: Script.Script,
      }),
    },
  });

  export const CreateNotebook = Operation.make({
    meta: { key: `${SCRIPT_OPERATION}/create-notebook`, name: 'Create Notebook' },
    schema: {
      input: Schema.extend(
        ScriptAction.NotebookProps,
        Schema.Struct({
          db: Database.Database,
        }),
      ),
      output: Schema.Struct({
        object: Notebook.Notebook,
      }),
    },
  });
}
