//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';

import * as Support from './Support';

export const CreateTicket = Operation.make({
  meta: {
    key: 'org.dxos.function.support.create-ticket',
    name: 'Create Support Ticket',
    description: 'Creates a new support ticket in the active space.',
  },
  input: Schema.Struct({
    title: Schema.String.annotations({
      description: 'Short summary of the issue.',
    }),
    body: Schema.optional(
      Schema.String.annotations({
        description: 'Optional longer description of the issue.',
      }),
    ),
  }),
  output: Support.Ticket,
  services: [Database.Service],
});

export const MarkInProgress = Operation.make({
  meta: {
    key: 'org.dxos.function.support.mark-in-progress',
    name: 'Mark Support Ticket In Progress',
    description: 'Marks a support ticket as in progress.',
  },
  input: Schema.Struct({
    ticket: Ref.Ref(Support.Ticket).annotations({
      description: 'The ticket to mark as in progress.',
    }),
  }),
  output: Support.Ticket,
  services: [Database.Service],
});

export const ResolveTicket = Operation.make({
  meta: {
    key: 'org.dxos.function.support.resolve-ticket',
    name: 'Resolve Support Ticket',
    description: 'Marks a support ticket as resolved with optional resolution notes.',
  },
  input: Schema.Struct({
    ticket: Ref.Ref(Support.Ticket).annotations({
      description: 'The ticket to resolve.',
    }),
    resolution: Schema.optional(
      Schema.String.annotations({
        description: 'Optional notes describing how the issue was resolved.',
      }),
    ),
  }),
  output: Support.Ticket,
  services: [Database.Service],
});

export const SearchDocs = Operation.make({
  meta: {
    key: 'org.dxos.function.support.search-docs',
    name: 'Search Documentation',
    description: 'Searches DXOS / Composer documentation for the given query.',
  },
  input: Schema.Struct({
    query: Schema.String.annotations({
      description: 'Search query.',
    }),
    limit: Schema.optional(
      Schema.Number.annotations({
        description: 'Maximum number of results to return.',
      }),
    ),
  }),
  output: Schema.Struct({
    results: Schema.Array(
      Schema.Struct({
        title: Schema.String,
        url: Schema.String,
        excerpt: Schema.String,
      }),
    ),
  }),
});
