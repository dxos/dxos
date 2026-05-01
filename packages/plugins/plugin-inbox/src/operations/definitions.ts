//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import { Collection, Database, Feed, Obj, Ref } from '@dxos/echo';
import { CredentialsService, QueueService, Trace } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { Integration } from '@dxos/plugin-integration/types';
import { Actor, Message } from '@dxos/types';

import { meta } from '#meta';

import { Calendar, Mailbox } from '../types';

const INBOX_OPERATION = `${meta.id}.operation`;

/** Wire-shape of a `RemoteTarget` for getSyncTargets-style operations. */
const RemoteTarget = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String.pipe(Schema.optional),
});

/**
 * Discovery + idempotent materialization for Google Calendar.
 *
 * Calls Google's `/calendar/v3/users/me/calendarList`, find-or-creates a
 * local `Calendar` object per remote calendar (foreign-keyed by calendar
 * id), and returns descriptors. Picking which targets to keep on the
 * Integration is a separate, generic step in plugin-integration.
 */
export const GetGoogleCalendars = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.get-google-calendars`,
    name: 'Get Google Calendars',
    description: 'Discover Google Calendars reachable from an integration and materialize a Calendar object per remote calendar.',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Struct({
    targets: Schema.Array(RemoteTarget),
  }),
  // Same caveat as plugin-trello's GetTrelloBoards: declaring services here
  // forces DynamicRuntime validation to fail before the handler runs because
  // composer's invoker doesn't carry per-space Database. The handler
  // provides `Database.layer(db)` itself.
});

export const AddMailbox = Operation.make({
  meta: { key: `${INBOX_OPERATION}.add-mailbox`, name: 'Add Mailbox' },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Obj.Unknown,
    target: Schema.Union(Database.Database, Collection.Collection),
  }),
  output: Schema.Struct({
    id: Schema.String,
    subject: Schema.Array(Schema.String),
    object: Obj.Unknown,
  }),
});

export const DraftEmail = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.draft-email`,
    name: 'Draft email',
    description: 'Creates a new email draft.',
  },
  input: Schema.Struct({
    subject: Schema.String.annotations({
      description: 'The subject of the email.',
    }),
    to: Schema.String.annotations({
      description: 'The recipient email address.',
    }),
    body: Schema.String.annotations({
      description: 'The body of the email.',
    }),
    replyTo: Schema.optional(Ref.Ref(Message.Message)).annotations({
      description: 'The message to reply to.',
    }),
    mailbox: Ref.Ref(Mailbox.Mailbox).annotations({
      description: 'Mailbox to scope the draft to.',
    }),
  }),
  output: Schema.Struct({
    newMessageDXN: Schema.String,
  }),
  services: [Database.Service],
});

// TODO(wittjosiah): Reconcile with above.
export const DraftEmailAndOpen = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.draft-email-and-open`,
    name: 'Draft email and open',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    mode: Schema.optional(Schema.Literal('compose', 'reply', 'reply-all', 'forward')),
    message: Schema.optional(Schema.Any),
    subject: Schema.optional(Schema.String),
    body: Schema.optional(Schema.String),
    // TODO(wittjosiah): Should be Mailbox.Mailbox.
    mailbox: Schema.optional(Schema.Any),
  }),
  output: Schema.Void,
});

export const GmailSend = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.google-mail-send`,
    name: 'Send Gmail',
    description: 'Send emails via Gmail.',
  },
  input: Schema.Struct({
    userId: Schema.String.pipe(Schema.optional),
    message: Message.Message,
    integration: Ref.Ref(Integration.Integration)
      .annotations({
        description: 'Optional Integration to source credentials from. Falls back to database credentials.',
      })
      .pipe(Schema.optional),
    mailbox: Ref.Ref(Mailbox.Mailbox).pipe(
      Schema.annotations({ description: 'Optional mailbox to send from.' }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    id: Schema.String,
    threadId: Schema.String,
  }),
  services: [CredentialsService],
});

export const GoogleMailSync = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.google-mail-sync`,
    name: 'Sync Google Mail',
    description: 'Sync emails from Gmail to the mailbox feed.',
  },
  input: Schema.Struct({
    /**
     * The wrapping Integration. Sync ops always go through an Integration so
     * the per-target sync state (cursor, lastSyncAt, lastError, …) lives in
     * one canonical place. Mirrors `SyncTrelloBoard`'s shape.
     */
    integration: Ref.Ref(Integration.Integration).annotations({
      description: 'Reference to the wrapping Integration that owns the access token and target.',
    }),
    mailbox: Ref.Ref(Mailbox.Mailbox).annotations({ description: 'Reference to the mailbox object.' }),
    userId: Schema.String.pipe(Schema.optional),
    label: Schema.String.pipe(
      Schema.annotations({
        description: 'Gmail label to sync emails from. Defaults to inbox.',
      }),
      Schema.optional,
    ),
    after: Schema.Union(Schema.Number, Schema.String).pipe(
      Schema.annotations({
        description: 'Date to start syncing from, either a unix timestamp or yyyy-MM-dd string.',
      }),
      Schema.optional,
    ),
    restrictedMode: Schema.Boolean.pipe(
      Schema.annotations({
        description: 'Use restricted mode to limit to single date range and max 20 messages. Reduces subrequests.',
      }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    newMessages: Schema.Number,
  }),
  services: [Database.Service, Feed.FeedService, CredentialsService, Trace.TraceService],
});

// TODO(wittjosiah): Factor out notify of failures to invocation option.
export const SyncMailbox = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.sync-mailbox`,
    name: 'Sync Mailbox',
    description: 'Runs Google Mail sync and notifies of progress.',
  },
  services: [Capability.Service],
  // Two entry points:
  //  - `{ mailbox }` — sync that single mailbox (used by the per-mailbox
  //    graph action and `InitializeMailbox`'s sync button).
  //  - `{ integration }` — sync every Mailbox target attached to a Gmail
  //    Integration (used as the Gmail provider's `sync` op).
  input: Schema.Union(
    Schema.Struct({ mailbox: Mailbox.Mailbox }),
    Schema.Struct({ integration: Ref.Ref(Integration.Integration) }),
  ),
  output: Schema.Void,
});

export const GoogleCalendarSync = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.google-calendar-sync`,
    name: 'Sync Google Calendar',
    description:
      'Sync events from Google Calendar. The initial sync uses startTime ordering for specified number of days. Subsequent syncs use updatedMin to catch all changes.',
  },
  input: Schema.Struct({
    /**
     * The wrapping Integration. Sync ops always go through an Integration so
     * the per-target sync state (cursor, lastSyncAt, lastError, …) lives in
     * one canonical place. Mirrors `SyncTrelloBoard`'s shape.
     */
    integration: Ref.Ref(Integration.Integration).annotations({
      description: 'Reference to the wrapping Integration that owns the access token and target.',
    }),
    calendar: Ref.Ref(Calendar.Calendar)
      .annotations({
        description:
          'Optional reference to a single calendar to sync. When omitted, every Calendar target on the Integration is synced (materializing on first run as needed).',
      })
      .pipe(Schema.optional),
    googleCalendarId: Schema.optional(Schema.String),
    syncBackDays: Schema.optional(Schema.Number),
    syncForwardDays: Schema.optional(Schema.Number),
    pageSize: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({
    newEvents: Schema.Number,
  }),
  services: [Database.Service, Feed.FeedService, CredentialsService],
});

// TODO(wittjosiah): Factor out notify of failures to invocation option.
export const SyncCalendar = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.sync-calendar`,
    name: 'Sync Calendar',
    description: 'Runs Google Calendar sync and notifies of progress.',
  },
  services: [Capability.Service],
  // Two entry points:
  //  - `{ calendar }` — sync that single calendar (used by the per-calendar
  //    graph action).
  //  - `{ integration }` — sync every Calendar target attached to a Google
  //    Calendar Integration (used as the Calendar provider's `sync` op).
  input: Schema.Union(
    Schema.Struct({ calendar: Calendar.Calendar }),
    Schema.Struct({ integration: Ref.Ref(Integration.Integration) }),
  ),
  output: Schema.Void,
});

export const ReadEmail = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.read-email`,
    name: 'Read email',
    description: 'Opens and reads the contents of a mailbox.',
  },
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotations({
      description: 'Reference to the mailbox object.',
    }),
    skip: Schema.Number.pipe(
      Schema.annotations({
        description: 'The number of messages to skip.',
      }),
      Schema.optional,
    ),
    limit: Schema.Number.pipe(
      Schema.annotations({
        description: 'The maximum number of messages to read. Do not provide a value unless directly asked.',
      }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    content: Schema.String,
  }),
  services: [Database.Service, Feed.FeedService],
});

export const SummarizeMailbox = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.summarize-mailbox`,
    name: 'Summarize mailbox',
    description: 'Write a summary of all of the emails in the mailbox.',
  },
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotations({
      description: 'Reference to the mailbox object.',
    }),
    skip: Schema.Number.pipe(
      Schema.annotations({
        description: 'The number of messages to skip.',
      }),
      Schema.optional,
    ),
    limit: Schema.Number.pipe(
      Schema.annotations({
        description: 'The maximum number of messages to read. Do not provide a value unless directly asked.',
      }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    summary: Schema.String.annotations({
      description: 'The summary of the mailbox.',
    }),
  }),
  services: [Database.Service, Feed.FeedService, AiService.AiService, QueueService],
});

export const ClassifyEmail = Operation.make({
  meta: {
    key: `${INBOX_OPERATION}.classify-email`,
    name: 'Classify email',
    description:
      'Classifies an email message by selecting and applying an appropriate tag from available tags in the database.',
  },
  input: Schema.Struct({
    message: Schema.Any.annotations({
      description: 'The message object to classify.',
    }),
  }),
  output: Schema.Union(
    Schema.Struct({
      tagId: Schema.String.annotations({
        description: 'The ID of the selected tag.',
      }),
      tagLabel: Schema.String.annotations({
        description: 'The label of the selected tag.',
      }),
    }),
    Schema.Void,
  ),
  services: [AiService.AiService, Database.Service, Feed.FeedService],
});

export const ExtractContact = Operation.make({
  meta: { key: `${INBOX_OPERATION}.extract-contact`, name: 'Extract Contact' },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    actor: Actor.Actor,
  }),
  output: Schema.Void,
});
