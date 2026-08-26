//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Operation from '@dxos/compute/Operation';
import * as Script from '@dxos/compute/Script';
import { Database, DXN, Type } from '@dxos/echo';

import { templates } from '../templates';

export const ScriptProps = Schema.Struct({
  name: Schema.optional(Schema.String),
  gistUrl: Schema.optional(Schema.String.annotate({ title: 'Import from Gist (url)' })),
  initialTemplateId: Schema.Literals(templates.map(({ id }) => id)).pipe(
    Schema.annotate({ title: 'Template' }),
    Schema.optional,
  ),
});

export const NotebookProps = Schema.Struct({
  name: Schema.optional(Schema.String),
});

export const CreateScript = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.script.create'),
    name: 'Create Script',
    icon: 'ph--code--regular',
  },
  input: ScriptProps.mapFields(
    Struct.assign({
      db: Database.Database,
    }),
  ),
  output: Schema.Struct({
    object: Type.getSchema(Script.Script),
  }),
});
