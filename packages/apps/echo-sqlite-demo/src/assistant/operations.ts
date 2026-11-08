//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';

/**
 * The tools the assistant has over this graph.
 *
 * Each is an ordinary operation declaring `Database.Service`, which the app provides from the
 * database the page is already reading — so a tool call and a click write through the same API and
 * reach the other peers through the same sync.
 */

export const FindRecords = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.echoSqliteDemo.find'),
    name: 'Find records',
    description:
      'Search the graph. Give a typename to list one kind, text to search every field, or both. ' +
      'Returns the records as JSON, including their ids, which the other tools take.',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({
    typename: Schema.optional(
      Schema.String.annotate({
        description: 'Restrict to one type, e.g. `com.example.type.person`.',
      }),
    ),
    text: Schema.optional(
      Schema.String.annotate({
        description: 'Full-text search across the records; omit to list them.',
      }),
    ),
    limit: Schema.optional(Schema.Number.annotate({ description: 'Maximum results.', default: 20 })),
  }),
  output: Schema.Array(Schema.Unknown),
  services: [Database.Service],
});

export const CreateRecord = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.echoSqliteDemo.create'),
    name: 'Create record',
    description:
      'Create one record of a type in this graph. `values` are the type’s own fields; the ' +
      'instructions list them. Returns the stored record, whose id links it to others.',
    icon: 'ph--plus--regular',
  },
  input: Schema.Struct({
    typename: Schema.String.annotate({
      description: 'The type to create, e.g. `com.example.type.event`.',
    }),
    values: Schema.Record(Schema.String, Schema.Unknown).annotate({
      description: 'The record’s fields, by name. References are set with `link`, not here.',
    }),
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});

export const LinkRecords = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.echoSqliteDemo.link'),
    name: 'Link records',
    description:
      'Point one record at another: a person at their employer, an event at an attendee. ' +
      'A single-valued property is replaced; a list gains the target.',
    icon: 'ph--graph--regular',
  },
  input: Schema.Struct({
    source: Schema.String.annotate({ description: 'The id of the record that holds the reference.' }),
    property: Schema.String.annotate({ description: 'The property to set, e.g. `employer`, `attendees`.' }),
    target: Schema.String.annotate({ description: 'The id of the record it points at.' }),
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});
