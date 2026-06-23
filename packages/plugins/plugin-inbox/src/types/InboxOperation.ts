//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import { Credential, Operation, Trace } from '@dxos/compute';
import { Collection, Database, Obj, Ref, Type, DXN } from '@dxos/echo';
import { Integration } from '@dxos/plugin-integration';
import { Actor, Event, Message } from '@dxos/types';

import { meta } from '#meta';

import * as Calendar from './Calendar';
import * as Mailbox from './Mailbox';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/** Wire-shape of a `RemoteTarget` for getSyncTargets-style operations. */
const RemoteTarget = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String.pipe(Schema.optional),
});

export const GetGoogleCalendars = Operation.make({
  // TODO(wittjosiah): Declaring services here forces DynamicRuntime validation to fail before the handler
  //   runs because composer's invoker doesn't carry per-space Database. The handler provides
  //   `Database.layer(db)` itself (same pattern as plugin-trello GetTrelloBoards).
  meta: {
    key: makeKey('getGoogleCalendars'),
    name: 'Get Google Calendars',
    description:
      'Discover Google Calendars reachable from an integration and materialize a Calendar object per remote calendar.',
    icon: 'ph--calendar--regular',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Struct({
    targets: Schema.Array(RemoteTarget),
  }),
});

export const AddMailbox = Operation.make({
  meta: { key: makeKey('addMailbox'), name: 'Add Mailbox', icon: 'ph--envelope--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Obj.Unknown,
    target: Schema.Union(Database.Database, Type.getSchema(Collection.Collection)),
  }),
  output: Schema.Struct({
    id: Schema.String,
    subject: Schema.Array(Schema.String),
    object: Obj.Unknown,
  }),
});

export const DraftEmail = Operation.make({
  meta: {
    key: makeKey('draftEmail'),
    name: 'Draft email',
    description: 'Creates a new email draft.',
    icon: 'ph--pencil--regular',
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
}).pipe(Operation.visible);

// TODO(wittjosiah): Reconcile with above.
export const DraftEmailAndOpen = Operation.make({
  meta: {
    key: makeKey('draftEmailAndOpen'),
    name: 'Draft email and open',
    icon: 'ph--pencil--regular',
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
    key: makeKey('googleMailSend'),
    name: 'Send Gmail',
    description: 'Send emails via Gmail.',
    icon: 'ph--paper-plane-tilt--regular',
  },
  input: Schema.Struct({
    userId: Schema.String.pipe(Schema.optional),
    message: Type.getSchema(Message.Message),
    integration: Ref.Ref(Integration.Integration).annotations({
      description: 'Integration to source Gmail credentials from.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.String,
    threadId: Schema.String,
  }),
  services: [Credential.CredentialsService],
}).pipe(Operation.visible);

export const GoogleMailSync = Operation.make({
  meta: {
    key: makeKey('googleMailSync'),
    name: 'Sync Google Mail',
    description: 'Sync emails from Gmail to the mailbox feed.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration).annotations({
      description: 'Integration that owns credentials and per-target sync metadata.',
    }),
    mailbox: Ref.Ref(Mailbox.Mailbox)
      .annotations({ description: 'When omitted, syncs every mailbox listed on the Integration.' })
      .pipe(Schema.optional),
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
  services: [Capability.Service, Database.Service, Credential.CredentialsService, Trace.TraceService],
}).pipe(Operation.visible);

export const GoogleCalendarSync = Operation.make({
  meta: {
    key: makeKey('googleCalendarSync'),
    name: 'Sync Google Calendar',
    description:
      'Sync events from Google Calendar. The initial sync uses startTime ordering for specified number of days. Subsequent syncs use updatedMin to catch all changes.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration).annotations({
      description: 'Integration that owns credentials and per-target sync metadata.',
    }),
    calendar: Ref.Ref(Calendar.Calendar)
      .annotations({
        description:
          'When omitted, syncs every calendar target on the Integration (materializing on first run as needed).',
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
  services: [Database.Service, Credential.CredentialsService],
}).pipe(Operation.visible);

/**
 * Create a single event on Google Calendar (the write counterpart to {@link GoogleCalendarSync}, and
 * the calendar analogue of {@link GmailSend}). Sources credentials from the Integration.
 */
export const CreateGoogleCalendarEvent = Operation.make({
  meta: {
    key: makeKey('createGoogleCalendarEvent'),
    name: 'Create Google Calendar Event',
    description: 'Create an event on Google Calendar.',
    icon: 'ph--calendar-plus--regular',
  },
  input: Schema.Struct({
    event: Type.getSchema(Event.Event),
    googleCalendarId: Schema.String.annotations({ description: 'Remote Google calendar id.' }),
    integration: Ref.Ref(Integration.Integration).annotations({
      description: 'Integration to source Google Calendar credentials from.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.String.annotations({ description: 'Remote Google event id.' }),
  }),
  services: [Credential.CredentialsService],
}).pipe(Operation.visible);

/**
 * Push draft (locally-created, not-yet-synced) events for a calendar up to Google Calendar, then
 * reconcile: each created event is stamped with its Google foreign key and the local draft object
 * is removed (the canonical copy lands in the calendar feed on the next read-sync). Mirrors the
 * email draft → send flow. When `event` is given, only that draft event is synced.
 */
export const SyncDraftEvents = Operation.make({
  meta: {
    key: makeKey('syncDraftEvents'),
    name: 'Sync draft events',
    description: 'Create locally-drafted calendar events on Google Calendar.',
    icon: 'ph--calendar-check--regular',
  },
  // The Calendar (and optional Event) are passed as live ECHO objects (validated in the handler);
  // services mirror GoogleCalendarSync since the handler creates events, then re-syncs the feed.
  input: Schema.Struct({
    calendar: Schema.Any,
    event: Schema.optional(Schema.Any),
  }),
  output: Schema.Struct({
    synced: Schema.Number,
  }),
  services: [Database.Service, Credential.CredentialsService],
});

/**
 * Delete a calendar event. A draft (local) event is simply removed from the database; a synced
 * event is deleted on Google Calendar (by its foreign key) and removed from the calendar feed.
 */
export const DeleteEvent = Operation.make({
  meta: {
    key: makeKey('deleteEvent'),
    name: 'Delete event',
    description: 'Delete a calendar event locally and on Google Calendar.',
    icon: 'ph--trash--regular',
  },
  input: Schema.Struct({
    calendar: Schema.Any,
    event: Schema.Any,
  }),
  output: Schema.Struct({ deleted: Schema.Boolean }),
  services: [Database.Service, Credential.CredentialsService],
});

/**
 * Delete an email. A draft (local) message is simply removed from the database; a synced message is
 * moved to the trash on Gmail (by its foreign key) and removed from the mailbox feed.
 */
export const DeleteEmail = Operation.make({
  meta: {
    key: makeKey('deleteEmail'),
    name: 'Delete email',
    description: 'Delete an email locally and move it to the Gmail trash.',
    icon: 'ph--trash--regular',
  },
  input: Schema.Struct({
    mailbox: Schema.Any,
    message: Schema.Any,
  }),
  output: Schema.Struct({ deleted: Schema.Boolean }),
  services: [Database.Service, Credential.CredentialsService],
});

export const GetGoogleContactGroups = Operation.make({
  meta: {
    key: makeKey('getGoogleContactGroups'),
    name: 'Get Google Contact Groups',
    description: 'Discover Google Contact Groups reachable from an integration.',
    icon: 'ph--users--regular',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Struct({
    targets: Schema.Array(RemoteTarget),
  }),
});

export const GoogleContactsSync = Operation.make({
  meta: {
    key: makeKey('googleContactsSync'),
    name: 'Sync Google Contacts',
    description: 'Sync contacts from a Google Contact group into Person objects in the space.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration).annotations({
      description: 'Integration that owns credentials and per-target sync metadata.',
    }),
    contactGroupResourceName: Schema.optional(Schema.String).annotations({
      description:
        'Google contact group resource name (e.g. contactGroups/myContacts). Syncs all targets when omitted.',
    }),
    pageSize: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({
    upserted: Schema.Number,
  }),
  services: [Database.Service, Credential.CredentialsService],
}).pipe(Operation.visible);

export const SyncContacts = Operation.make({
  meta: {
    key: makeKey('syncContacts'),
    name: 'Sync Contacts',
    description: 'Runs Google Contacts sync and notifies of progress.',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Void,
});

export const ReadEmail = Operation.make({
  meta: {
    key: makeKey('readEmail'),
    name: 'Read email',
    description: 'Opens and reads the contents of a mailbox.',
    icon: 'ph--envelope-open--regular',
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
  services: [Database.Service],
});
export const ClassifyEmail = Operation.make({
  meta: {
    key: makeKey('classifyEmail'),
    name: 'Classify email',
    description:
      'Classifies an email message by selecting and applying an appropriate tag from available tags in the database.',
    icon: 'ph--tag--regular',
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
  services: [AiService.AiService, Database.Service],
});

export const ExtractContact = Operation.make({
  meta: { key: makeKey('extractContact'), name: 'Extract Contact', icon: 'ph--user--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    actor: Actor.Actor,
  }),
  output: Schema.Void,
});

/**
 * Operation form of the contact extractor — runs against a full Message and returns
 * Person/Organization proposals via the shared ExtractResult shape, without touching the
 * database. The dispatcher (ExtractMessage) is responsible for db.add + ExtractedFrom. The
 * actor-targeted `ExtractContact` above stays as the avatar-button entry point and commits
 * directly via SpaceOperation.AddObject (no preview interposition there by design).
 */
/**
 * Uniform input shape every extractor operation receives — generalised over any source ECHO
 * object (`source`), not just messages. Defined late in this file (after the other
 * Operation.make calls) so its `Schema.Struct` call doesn't run before `Database.Database` is
 * initialised — moving it earlier triggers a load-order cycle that leaves `Database.Database`
 * undefined when the struct is constructed.
 */
export const ExtractInputSchema = Schema.Struct({
  db: Database.Database,
  source: Obj.Unknown,
});

/** Runtime Schema for `@dxos/extractor` `ExtractResult`. See ExtractInputSchema for rationale. */
export const ExtractResultSchema = Schema.Struct({
  created: Schema.Array(Schema.Any),
  updated: Schema.optional(Schema.Array(Schema.Any)),
  relations: Schema.Array(Schema.Any),
  tags: Schema.optional(Schema.Array(Schema.Struct({ label: Schema.String, hue: Schema.optional(Schema.String) }))),
  summary: Schema.optional(Schema.String),
});

export const ExtractContactFromMessage = Operation.make({
  meta: {
    key: makeKey('extractContactFromMessage'),
    name: 'Extract Contact from Message',
    icon: 'ph--user--regular',
  },
  services: [Capability.Service],
  input: ExtractInputSchema,
  output: ExtractResultSchema,
});

/**
 * Operation form of the summarize extractor — runs against a full Message and returns a
 * Markdown.Document containing an AI-generated summary of the message body. The dispatcher
 * (`ExtractMessage`) is responsible for `db.add` + `ExtractedFrom`.
 */
export const ExtractSummaryFromMessage = Operation.make({
  meta: {
    key: makeKey('extractSummaryFromMessage'),
    name: 'Extract Summary from Message',
    icon: 'ph--text-aa--regular',
  },
  services: [Capability.Service, AiService.AiService],
  input: ExtractInputSchema,
  output: ExtractResultSchema,
});

export const ExtractMessage = Operation.make({
  meta: { key: makeKey('extractMessage'), name: 'Extract Message' },
  services: [Capability.Service, AiService.AiService],
  input: Schema.Struct({
    db: Database.Database,
    source: Obj.Unknown,
    extractorId: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    extractorId: Schema.String,
    created: Schema.Number,
    updated: Schema.Number,
    summary: Schema.optional(Schema.String),
  }),
});
