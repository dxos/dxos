//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

import * as Outline from './Outline';

const OUTLINER_OPERATION = `${DXN.getName(meta.id)}.operation`;

export const CreateOutline = Operation.make({
  meta: { key: DXN.make(`${OUTLINER_OPERATION}.createOutline`), name: 'Create Outline', icon: 'ph--list-bullets--regular' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Outline.Outline,
  }),
});

export const QuickJournalEntry = Operation.make({
  meta: { key: DXN.make(`${OUTLINER_OPERATION}.quickEntry`), name: 'Quick Journal Entry', icon: 'ph--pencil--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    text: Schema.String,
  }),
  output: Schema.Void,
});
