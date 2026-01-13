//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { Script } from '@dxos/functions';
import * as Operation from '@dxos/operation';

import { meta } from '../meta';
import { templates } from '../templates';

const SCRIPT_OPERATION = `${meta.id}/operation`;

export namespace ScriptOperation {
  export const ScriptProps = Schema.Struct({
    name: Schema.optional(Schema.String),
    // TODO(wittjosiah): Placeholder annotation?
    gistUrl: Schema.optional(Schema.String.annotations({ title: 'Import from Gist (url)' })),
    initialTemplateId: Schema.Literal(...templates.map(({ id }) => id)).pipe(
      Schema.annotations({ title: 'Template' }),
      Schema.optional,
    ),
  });

  export const NotebookProps = Schema.Struct({
    name: Schema.optional(Schema.String),
  });

  export const CreateScript = Operation.make({
    meta: { key: `${SCRIPT_OPERATION}/create-script`, name: 'Create Script' },
    schema: {
      input: Schema.extend(
        ScriptProps,
        Schema.Struct({
          db: Database.Database,
        }),
      ),
      output: Schema.Struct({
        object: Script.Script,
      }),
    },
  });
}
