//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Memory } from '../../../types/Memory';

export const QueryMemories = Operation.make({
  meta: {
    key: 'org.dxos.function.memory.query',
    name: 'Query memories',
    description:
      'Search for stored memories using full-text search. Returns memories matching the query terms. Use this to recall previously saved knowledge, facts, or preferences.',
  },
  input: Schema.Struct({
    text: Schema.optional(
      Schema.String.annotations({
        description: 'Full-text search query. Omit to list all memories.',
        examples: ['new york trip date plan', 'favorite color', 'project cyberdyne'],
      }),
    ),
    limit: Schema.optional(
      Schema.Number.annotations({
        description: 'Maximum number of results to return.',
        default: 10,
      }),
    ),
  }),
  output: Schema.Array(Schema.Unknown),
  services: [Database.Service],
});

export const SaveMemory = Operation.make({
  meta: {
    key: 'org.dxos.function.memory.save',
    name: 'Save memory',
    description:
      'Saves a new memory to the database. Use this to persist knowledge, facts, preferences, or any information that should be remembered across conversations.',
  },
  input: Schema.Struct({
    title: Schema.String.annotations({
      description: 'Short descriptive title for the memory.',
    }),
    content: Schema.String.annotations({
      description:
        'The content of the memory. Can be a fact, preference, instruction, or any knowledge worth persisting.',
    }),
  }),
  output: Schema.Unknown,
  services: [Database.Service],
});

export const DeleteMemory = Operation.make({
  meta: {
    key: 'org.dxos.function.memory.delete',
    name: 'Delete memory',
    description: 'Deletes a memory from the database. Use this to remove outdated or incorrect memories.',
  },
  input: Schema.Struct({
    memory: Ref.Ref(Memory),
  }),
  output: Schema.Void,
  services: [Database.Service],
});
