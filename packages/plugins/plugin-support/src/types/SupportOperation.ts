//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { SpaceSchema } from '@dxos/client-protocol';
import { Operation } from '@dxos/compute';
import { Collection, Database, Format, Ref } from '@dxos/echo';

import * as Support from './Support';

export const OnCreateSpace = Operation.make({
  meta: { key: 'org.dxos.function.support.on-create-space', name: 'On Create Space' },
  services: [Capability.Service],
  input: Schema.Struct({
    space: SpaceSchema,
    rootCollection: Collection.Collection,
    isDefault: Schema.Boolean.pipe(Schema.optional),
  }),
  output: Schema.Void,
});

// Schema annotations consumed by `react-ui-form`. Strings duplicated in translations.ts
// — kept inline here to avoid an import cycle (translations -> #types -> SupportOperation).
export const UserFeedback = Schema.Struct({
  message: Format.Text.pipe(
    Schema.nonEmptyString(),
    Schema.maxLength(4_096),
    Schema.annotations({
      title: 'Feedback',
      description: 'Please enter your feedback, technical issue, or feature request.',
    }),
  ),
  includeLogs: Schema.Boolean.pipe(
    Schema.annotations({
      title: 'Include debug logs',
    }),
    Schema.optional,
  ),
});

export type UserFeedback = Schema.Schema.Type<typeof UserFeedback>;

export const CaptureUserFeedback = Operation.make({
  meta: {
    key: 'org.dxos.function.support.capture-feedback',
    name: 'Capture User Feedback',
    description: 'Capture one-shot user feedback (sent to the observability backend).',
  },
  services: [Capability.Service],
  input: UserFeedback,
  output: Schema.UndefinedOr(Schema.String),
});

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
      Schema.Number.pipe(Schema.int(), Schema.positive()).annotations({
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
