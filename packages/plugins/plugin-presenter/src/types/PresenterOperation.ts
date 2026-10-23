//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN, Type } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import * as Presentation from './Presentation.ts';

export const SetPresenting = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.presenter.setPresenting'),
    name: 'Set Presenting',
    icon: 'ph--presentation--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Schema.Union([Type.getSchema(Markdown.Document), Type.getSchema(Presentation.Presentation)]),
    // Required: absent used to mean "flip".
    state: Schema.Boolean,
  }),
  output: Schema.Void,
});
