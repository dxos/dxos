//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Task } from '@dxos/types';

import { meta } from '#meta';

import * as Outline from './Outline';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

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

export const ConvertToTask = Operation.make({
  meta: {
    key: makeKey('convertToTask'),
    name: 'Convert to Task',
    icon: 'ph--check-circle--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    outline: Type.getSchema(Outline.Outline),
    title: Schema.String,
  }),
  output: Schema.Struct({
    task: Type.getSchema(Task.Task),
  }),
});

export const QuickJournalEntry = Operation.make({
  meta: { key: makeKey('quickEntry'), name: 'Quick Journal Entry', icon: 'ph--pencil--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    text: Schema.String,
  }),
  output: Schema.Void,
}).pipe(Operation.visible);
