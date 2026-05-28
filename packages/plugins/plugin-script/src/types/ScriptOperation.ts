//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Script, Operation } from '@dxos/compute';
import { Database, Type } from '@dxos/echo';

import { meta } from '#meta';

import { templates } from '../templates';

const SCRIPT_OPERATION = `${meta.id}.operation`;

export const ScriptProps = Schema.Struct({
  name: Schema.optional(Schema.String),
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
  meta: { key: `${SCRIPT_OPERATION}.create-script`, name: 'Create Script', icon: 'ph--code--regular' },
  input: Schema.extend(
    ScriptProps,
    Schema.Struct({
      db: Database.Database,
    }),
  ),
  output: Schema.Struct({
    object: Type.getSchema(Script.Script),
  }),
});
