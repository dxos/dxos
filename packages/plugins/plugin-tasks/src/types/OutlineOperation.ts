//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Outline, Task } from '@dxos/types';

import { meta } from '#meta';

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

//
// MCP-projected verbs (MILESTONE-5.md §7.2/§7.4): refs in, plain values out, Database-only.
//

export const GetOutline = Operation.make({
  meta: {
    key: makeKey('outlineGet'),
    name: 'Get Outline',
    description: "Read an outline's checklist markdown and its parsed items.",
    icon: 'ph--list-checks--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    outline: Ref.Ref(Outline.Outline),
  }),
  output: Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    content: Schema.String,
    items: Schema.Array(Schema.Struct({ title: Schema.String, done: Schema.Boolean })),
  }),
}).pipe(Operation.mcpTool({ name: 'outlineGet', safety: 'read', aspect: 'tasks' }));

export const UpdateOutline = Operation.make({
  meta: {
    key: makeKey('outlineUpdate'),
    name: 'Update Outline',
    description:
      'Update an outline: upsert checklist items by title (preserving position and surrounding prose), or replace the markdown wholesale.',
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    outline: Ref.Ref(Outline.Outline),
    /** Upserted by title: existing lines keep their position, new ones append. */
    items: Schema.optional(Schema.Array(Schema.Struct({ title: Schema.String, done: Schema.Boolean }))),
    /** Replaces the whole document; mutually exclusive with `items`. */
    content: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    id: Schema.String,
    content: Schema.String,
  }),
}).pipe(Operation.mcpTool({ name: 'outlineUpdate', safety: 'write', aspect: 'tasks' }));
