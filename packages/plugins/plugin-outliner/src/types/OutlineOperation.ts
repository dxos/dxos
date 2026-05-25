//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';

import { meta } from '#meta';

import * as Outline from './Outline';

const OUTLINER_OPERATION = `${meta.id}.operation`;

export const CreateOutline = Operation.make({
  meta: { key: `${OUTLINER_OPERATION}.create-outline`, name: 'Create Outline', icon: 'ph--list-bullets--regular' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Outline.Outline),
  }),
});

export const QuickJournalEntry = Operation.make({
  meta: { key: `${OUTLINER_OPERATION}.quick-entry`, name: 'Quick Journal Entry', icon: 'ph--pencil--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    text: Schema.String,
  }),
  output: Schema.Void,
});
