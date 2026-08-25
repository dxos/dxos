//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Outline, Task, TaskSet } from '@dxos/types';

/**
 * Promotes an outline bullet to a task, creating the outline's own task set on first use and
 * appending to its membership array — a three-object write no generic create expresses.
 */
export const ConvertToTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.convert'),
    name: 'Convert to Task',
    icon: 'ph--check-circle--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    // The destination is explicit: an outline owns no task set, so promotion files into the ledger
    // of whatever owns the outline, which only the caller knows.
    taskSet: Type.getSchema(TaskSet.TaskSet),
    title: Schema.String,
  }),
  output: Schema.Struct({
    task: Type.getSchema(Task.Task),
  }),
}).pipe(Operation.mutation('write'));

/**
 * Appends a bullet to today's journal entry, creating the journal and the entry when either is
 * absent: a get-or-create chain across three objects, not a write to a known one.
 */
export const QuickJournalEntry = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.appendJournalEntry'),
    name: 'Quick Journal Entry',
    icon: 'ph--pencil--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    text: Schema.String,
  }),
  output: Schema.Void,
}).pipe(Operation.visible, Operation.mutation('write'));

//
// MCP-projected verbs (MILESTONE-5.md §7.2/§7.4): refs in, plain values out, Database-only.
//

/**
 * Reads an outline with its checklist parsed out of the markdown. `items` is derived from the text,
 * not stored, so a generic object read returns only the raw content.
 */
export const GetOutline = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.getOutline'),
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
}).pipe(Operation.mutation('none'));

/**
 * Upserts checklist items into the markdown so an agent can flip one box without rewriting the
 * document — the text is a human surface too, and prose between items has to survive. A generic
 * update can only replace the whole string.
 */
export const UpdateOutline = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.updateOutline'),
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
}).pipe(Operation.mutation('write'));
