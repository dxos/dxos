//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';

import { CodeProject, Spec } from '#types';

export const VerifySpec = Operation.make({
  meta: {
    key: 'org.dxos.function.code.verify-spec',
    name: 'Verify Spec',
    description: 'Lints and structurally validates a DEUS spec.',
  },
  input: Schema.Struct({
    spec: Ref.Ref(Spec.Spec).annotations({ description: 'The Spec to verify.' }),
  }),
  output: Schema.Struct({
    ok: Schema.Boolean,
    messages: Schema.Array(Schema.String),
  }),
  services: [Database.Service],
});

export const RunBuildAgent = Operation.make({
  meta: {
    key: 'org.dxos.function.code.run-build-agent',
    name: 'Run Build Agent',
    description: 'Dispatches a build of a CodeProject via the EDGE build service.',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotations({
      description: 'The CodeProject to build.',
    }),
  }),
  output: Schema.Struct({
    status: Schema.Literal('queued', 'running', 'succeeded', 'failed'),
  }),
  services: [Database.Service],
});
