//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { Ir } from '#model';

import * as Diagram from './Diagram';

/** One validator finding, shaped so the caller can repair the named field and retry. */
const Diagnostic = Schema.Struct({
  code: Schema.String.annotate({ description: 'Rule code, e.g. "route/crosses-component".' }),
  severity: Schema.Literals(['error', 'warning']),
  message: Schema.String,
  subject: Schema.Record(Schema.String, Schema.Unknown).annotate({ description: 'What the finding is about.' }),
  evidence: Schema.Record(Schema.String, Schema.Unknown).annotate({ description: 'Measurements behind it.' }),
  supportedFixes: Schema.Array(Schema.String).annotate({ description: 'IR fields that can clear it.' }),
});

const Report = {
  ok: Schema.Boolean.annotate({ description: 'False when any diagnostic has severity "error".' }),
  diagnostics: Schema.Array(Diagnostic),
};

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.archify.create'),
    name: 'Create Diagram',
    description: 'Creates an Archify architecture diagram, optionally seeded with an IR document.',
    icon: 'ph--tree-structure--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    source: Schema.optional(Ir.Architecture).annotate({ description: 'Initial IR; a placeholder is used if omitted.' }),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Diagram.Diagram),
    ...Report,
  }),
  services: [Database.Service],
});

export const Read = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.archify.read'),
    name: 'Read Diagram',
    description:
      'Returns a diagram’s current IR together with its validation report. Call before editing so edits are made against what is actually stored.',
    icon: 'ph--eye--regular',
  },
  input: Schema.Struct({
    diagram: Ref.Ref(Diagram.Diagram).annotate({ description: 'The diagram to read.' }),
  }),
  output: Schema.Struct({
    source: Ir.Architecture,
    ...Report,
  }),
  services: [Database.Service],
});

export const Verify = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.archify.verify'),
    name: 'Verify Diagram',
    description:
      'Checks an IR document without storing it: schema, placement, route clearance and label clearance. Use it to iterate on a draft before writing.',
    icon: 'ph--check-circle--regular',
  },
  input: Schema.Struct({
    source: Schema.Unknown.annotate({ description: 'The candidate IR document.' }),
  }),
  output: Schema.Struct(Report),
  services: [],
});

export const Write = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.archify.write'),
    name: 'Write Diagram',
    description:
      'Replaces a diagram’s IR. The write is rejected when validation reports an error, so a diagram on screen is always one that passed its checks.',
    icon: 'ph--pencil-simple-line--regular',
  },
  input: Schema.Struct({
    diagram: Ref.Ref(Diagram.Diagram).annotate({ description: 'The diagram to replace.' }),
    source: Schema.Unknown.annotate({ description: 'The complete replacement IR document.' }),
  }),
  output: Schema.Struct({
    ...Report,
    written: Schema.Boolean.annotate({ description: 'False when the diagram was left untouched.' }),
  }),
  services: [Database.Service],
});
