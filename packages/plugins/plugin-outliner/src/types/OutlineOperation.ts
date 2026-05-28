//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

import * as Outline from './Outline';

const makeKey = (name: string) => DXN.make(`${DXN.getName(meta.id)}.operation.${name}`);

export const CreateOutline = Operation.make({
  meta: {
    key: makeKey('createOutline'),
    name: 'Create Outline',
    icon: 'ph--list-bullets--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Outline.Outline),
  }),
});

export const QuickJournalEntry = Operation.make({
  meta: { key: makeKey('quickEntry'), name: 'Quick Journal Entry', icon: 'ph--pencil--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    text: Schema.String,
  }),
  output: Schema.Void,
});
