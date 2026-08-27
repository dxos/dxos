//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Database, DXN, Format, Ref, Type } from '@dxos/echo';

import * as Support from './Support';

// Schema annotations consumed by `react-ui-form`. Strings duplicated in translations.ts
// — kept inline here to avoid an import cycle (translations -> #types -> SupportOperation).
export const IssueType = Schema.Literals(['bug', 'feature']).annotate({
  title: 'Type',
  description: 'Whether this is a bug report or a feature request.',
});
export type IssueType = Schema.Schema.Type<typeof IssueType>;

export const Severity = Schema.Literals(['High priority', 'Medium priority', 'Low priority']).annotate({
  title: 'Severity',
  description: 'How disruptive the issue is.',
});
export type Severity = Schema.Schema.Type<typeof Severity>;

/**
 * Form payload shared by all three FeedbackPanel submit actions (PostHog
 * feedback, Discord help thread, GitHub issue). `version` is a hidden form
 * field populated by the panel from runtime config and forwarded to the
 * backend for triage. `area` is a free-form plugin id; the panel
 * pre-populates options from the active plugin list.
 */
export const SupportRequest = Schema.Struct({
  title: Schema.String.pipe(
    Schema.check(Schema.isNonEmpty()),
    Schema.check(Schema.isMaxLength(256)),
    Schema.annotate({
      title: 'Title',
      description: 'Short summary of the issue.',
    }),
  ),
  body: Format.Text.pipe(
    Schema.check(Schema.isNonEmpty()),
    Schema.check(Schema.isMaxLength(16_384)),
    Schema.annotate({
      title: 'Description',
      description: 'Please describe the issue or feature request in detail.',
    }),
  ),
  area: Schema.String.annotate({
    title: 'Area',
    description: 'The plugin or area this relates to (optional).',
  }).pipe(Schema.optional),
  type: IssueType,
  severity: Severity,
  image: Schema.Boolean.pipe(
    Schema.annotate({
      title: 'Attach screenshot',
      description: 'Capture the current view and attach it to the report. Form fields are obscured for privacy.',
    }),
    Schema.optional,
  ),
  includeLogs: Schema.Boolean.pipe(
    Schema.annotate({
      title: 'Include debug logs',
    }),
    Schema.optional,
  ),
  // Hidden — auto-populated by FeedbackPanel; never rendered as an input.
  version: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
});

export type SupportRequest = Schema.Schema.Type<typeof SupportRequest>;

/** Legacy observability-backend input. Derived from {@link SupportRequest} by the FeedbackPanel. */
export const UserFeedback = Schema.Struct({
  message: Schema.String,
  includeLogs: Schema.Boolean.pipe(Schema.optional),
});

export type UserFeedback = Schema.Schema.Type<typeof UserFeedback>;

export const CaptureUserFeedback = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.captureFeedback'),
    name: 'Capture User Feedback',
    description: 'Capture one-shot user feedback (sent to the observability backend).',
    icon: 'ph--chat-text--regular',
  },
  services: [Capability.Service],
  input: UserFeedback,
  output: Schema.UndefinedOr(Schema.String),
});

export const CreateTicket = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.createTicket'),
    name: 'Create Support Ticket',
    description: 'Creates a new support ticket in the active space.',
    icon: 'ph--note--regular',
  },
  input: Schema.Struct({
    title: Schema.String.annotate({
      description: 'Short summary of the issue.',
    }),
    body: Schema.optional(
      Schema.String.annotate({
        description: 'Optional longer description of the issue.',
      }),
    ),
  }),
  output: Type.getSchema(Support.Ticket),
  services: [Database.Service],
});

export const MarkInProgress = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.markInProgress'),
    name: 'Mark Support Ticket In Progress',
    description: 'Marks a support ticket as in progress.',
    icon: 'ph--clock--regular',
  },
  input: Schema.Struct({
    ticket: Ref.Ref(Support.Ticket).annotate({
      description: 'The ticket to mark as in progress.',
    }),
  }),
  output: Type.getSchema(Support.Ticket),
  services: [Database.Service],
});

export const ResolveTicket = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.resolveTicket'),
    name: 'Resolve Support Ticket',
    description: 'Marks a support ticket as resolved with optional resolution notes.',
    icon: 'ph--check--regular',
  },
  input: Schema.Struct({
    ticket: Ref.Ref(Support.Ticket).annotate({
      description: 'The ticket to resolve.',
    }),
    resolution: Schema.optional(
      Schema.String.annotate({
        description: 'Optional notes describing how the issue was resolved.',
      }),
    ),
  }),
  output: Type.getSchema(Support.Ticket),
  services: [Database.Service],
});

export const SearchDocs = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.searchDocs'),
    name: 'Search Documentation',
    description: 'Searches DXOS / Composer documentation for the given query.',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({
    query: Schema.String.annotate({
      description: 'Search query.',
    }),
    limit: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isGreaterThan(0))).annotate({
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
