//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Collection, Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { Connection, Cursor } from '@dxos/link';
import { FactStore } from '@dxos/pipeline-rdf/fact-store';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
// Person is referenced in Actor.Actor's inferred type (via ExtractContact); importing it allows
// TypeScript to name it in the emitted .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Actor, Event, Message, type Person } from '@dxos/types';

import { meta } from '#meta';

import * as Mailbox from './Mailbox';
import * as MailSend from './MailSend';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const GetGoogleCalendars = Operation.make({
  // TODO(wittjosiah): Declaring services here forces DynamicRuntime validation to fail before the handler
  //   runs because composer's invoker doesn't carry per-space Database. The handler provides
  //   `Database.layer(db)` itself (same pattern as plugin-trello GetTrelloBoards).
  meta: {
    key: makeKey('getGoogleCalendars'),
    name: 'Get Google Calendars',
    description: 'Discover Google Calendars reachable from a connection without materializing local Calendars.',
    icon: 'ph--calendar--regular',
  },
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

export const AddMailbox = Operation.make({
  meta: { key: makeKey('addMailbox'), name: 'Add Mailbox', icon: 'ph--envelope--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Obj.Unknown,
    target: Schema.Union([Database.Database, Type.getSchema(Collection.Collection)]),
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
    subject: Schema.String.annotate({
      description: 'The subject of the email.',
    }),
    to: Schema.String.annotate({
      description: 'The recipient email address.',
    }),
    body: Schema.String.annotate({
      description: 'The body of the email.',
    }),
    replyTo: Schema.optional(Ref.Ref(Message.Message)).annotate({
      description: 'The message to reply to.',
    }),
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
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
    mode: Schema.optional(Schema.Literals(['compose', 'reply', 'reply-all', 'forward'])),
    message: Schema.optional(Schema.Any),
    subject: Schema.optional(Schema.String),
    body: Schema.optional(Schema.String),
    // TODO(wittjosiah): Should be Mailbox.Mailbox.
    mailbox: Schema.optional(Schema.Any),
    /**
     * Graph node id of the mailbox view the draft is composed from; a compose draft opens as a plank
     * beside it. Defaults to the mailbox's own node when the caller has no view context.
     */
    contextId: Schema.optional(Schema.String),
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
    ...MailSend.Input.fields,
  }),
  output: MailSend.Output,
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
    binding: Ref.Ref(Cursor.Cursor).annotate({
      description: 'Binding whose connection owns credentials and whose target is the Mailbox to sync.',
    }),
    userId: Schema.String.pipe(Schema.optional),
    label: Schema.String.pipe(
      Schema.annotate({
        description: 'Gmail label to sync emails from. Defaults to inbox.',
      }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    newMessages: Schema.Number,
  }),
  services: [Capability.Service, Database.Service, Credential.CredentialsService, Trace.TraceService],
}).pipe(Operation.visible, Operation.idempotent);

/**
 * Eagerly materializes the local Mailbox bound to a Gmail connection so the sync cursor's target
 * exists before the cursor is created. Gmail is a single-target connector with no remote selection,
 * so a fresh Mailbox is always created; the connection's `accessToken.account` seeds the default name.
 */
export const MaterializeGmailTarget = Operation.make({
  meta: {
    key: makeKey('materializeGmailTarget'),
    name: 'Materialize Gmail Target',
    description: 'Create the local Mailbox bound to a Gmail connection.',
    icon: 'ph--envelope--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

export const JmapSync = Operation.make({
  meta: {
    key: makeKey('jmapSync'),
    name: 'Sync JMAP',
    description: 'Sync emails from a JMAP server (e.g. Fastmail) to the mailbox feed.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    binding: Ref.Ref(Cursor.Cursor).annotate({
      description: 'Binding whose connection owns credentials and whose target is the Mailbox to sync.',
    }),
  }),
  output: Schema.Struct({
    newMessages: Schema.Number,
  }),
  // Capability (on-arrival extractors), Database (feed I/O), Trace (status) — provided by the invoker;
  // HTTP client and JMAP credentials are provided by the handler from the connection.
  services: [Capability.Service, Database.Service, Trace.TraceService],
}).pipe(Operation.visible, Operation.idempotent);

/**
 * Eagerly materializes the local Mailbox bound to a JMAP connection so the sync cursor's target
 * exists before the cursor is created. JMAP is a single-target connector (the account inbox), so a
 * fresh Mailbox is always created; the connection's `accessToken.account` seeds the default name.
 * Mirrors {@link MaterializeGmailTarget}.
 */
export const MaterializeJmapTarget = Operation.make({
  meta: {
    key: makeKey('materializeJmapTarget'),
    name: 'Materialize JMAP Target',
    description: 'Create the local Mailbox bound to a JMAP connection.',
    icon: 'ph--envelope--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

export const JmapSend = Operation.make({
  meta: {
    key: makeKey('jmapSend'),
    name: 'Send JMAP',
    description: 'Send an email via a JMAP server.',
    icon: 'ph--paper-plane-tilt--regular',
  },
  input: MailSend.Input,
  output: MailSend.Output,
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
    binding: Ref.Ref(Cursor.Cursor).annotate({
      description: 'Binding whose connection owns credentials and whose target is the Calendar to sync.',
    }),
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
 * Eagerly materializes the local Calendar for a selected remote Google calendar so the sync
 * cursor's target exists before the cursor is created. Find-or-create keyed on the calendar's
 * foreign key, so re-running for the same remote calendar returns the existing Calendar.
 */
export const MaterializeCalendarTarget = Operation.make({
  meta: {
    key: makeKey('materializeCalendarTarget'),
    name: 'Materialize Calendar Target',
    description: 'Create the local Calendar bound to a selected Google calendar.',
    icon: 'ph--calendar--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

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
    googleCalendarId: Schema.String.annotate({ description: 'Remote Google calendar id.' }),
    connection: Ref.Ref(Connection.Connection).annotate({
      description: 'Connection to source Google Calendar credentials from.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.String.annotate({ description: 'Remote Google event id.' }),
  }),
  services: [Credential.CredentialsService],
}).pipe(Operation.visible);

export const RenameFilter = Operation.make({
  meta: {
    key: makeKey('renameFilter'),
    name: 'Rename Filter',
    icon: 'ph--pencil-simple--regular',
  },
  input: Schema.Struct({
    mailbox: Schema.Any,
    name: Schema.String,
    caller: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const GetGoogleContactGroups = Operation.make({
  meta: {
    key: makeKey('getGoogleContactGroups'),
    name: 'Get Google Contact Groups',
    description: 'Discover Google Contact Groups reachable from a connection.',
    icon: 'ph--users--regular',
  },
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

export const GoogleContactsSync = Operation.make({
  meta: {
    key: makeKey('googleContactsSync'),
    name: 'Sync Google Contacts',
    description: 'Sync contacts from a Google Contact group into Person objects in the space.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    binding: Ref.Ref(Cursor.Cursor).annotate({
      description: 'Binding whose connection owns credentials and whose externalId is the contact group to sync.',
    }),
    pageSize: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({
    upserted: Schema.Number,
  }),
  services: [Database.Service, Credential.CredentialsService],
}).pipe(Operation.visible);

export const ReadEmail = Operation.make({
  meta: {
    key: makeKey('readEmail'),
    name: 'Read email',
    description: 'Opens and reads the contents of a mailbox.',
    icon: 'ph--envelope-open--regular',
  },
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Reference to the mailbox object.',
    }),
    skip: Schema.Number.pipe(
      Schema.annotate({
        description: 'The number of messages to skip.',
      }),
      Schema.optional,
    ),
    limit: Schema.Number.pipe(
      Schema.annotate({
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
    message: Schema.Any.annotate({
      description: 'The message object to classify.',
    }),
  }),
  output: Schema.Union([
    Schema.Struct({
      tagId: Schema.String.annotate({
        description: 'The ID of the selected tag.',
      }),
      tagLabel: Schema.String.annotate({
        description: 'The label of the selected tag.',
      }),
    }),
    Schema.Void,
  ]),
  services: [AiService.AiService, Database.Service],
});

/** @deprecated Use {@link ExtractContactFromMessage} + the message extractor pipeline instead. */
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
  services: [Capability.Service, AiService.AiService, Database.Service],
  input: Schema.Struct({
    // Live object or an immutable snapshot (feed messages resolve to snapshots); the handler
    // re-resolves the live proxy by id when available and reads only `source.id` otherwise.
    source: Schema.Any,
    extractorId: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    extractorId: Schema.String,
    created: Schema.Number,
    updated: Schema.Number,
    summary: Schema.optional(Schema.String),
  }),
});

/** Default parallel extraction limit for {@link ExtractMailbox}. */
export const DEFAULT_EXTRACT_MAILBOX_CONCURRENCY = 5;

/** @deprecated Use batch dispatchers like on-arrival extractors or direct ExtractMessage invocations instead. */
export const ExtractMailbox = Operation.make({
  meta: {
    key: makeKey('extractMailbox'),
    name: 'Extract Mailbox',
    description: 'Runs a selected extractor over every message in a mailbox feed.',
    icon: 'ph--magic-wand--regular',
  },
  services: [Capability.Service, AiService.AiService, Database.Service],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed messages are processed.',
    }),
    extractorId: Schema.String.annotate({
      description: 'Registered ObjectExtractor id to run on each message.',
    }),
    concurrency: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Maximum number of messages to extract in parallel.',
      }),
    ),
  }),
  output: Schema.Struct({
    extractorId: Schema.String,
    processed: Schema.Number,
    succeeded: Schema.Number,
    failed: Schema.Number,
    created: Schema.Number,
    updated: Schema.Number,
  }),
});

/** Default page size for {@link AnalyzeMailbox} fact-store commits. */
export const DEFAULT_ANALYZE_MAILBOX_PAGE_SIZE = 10;

export const AnalyzeMailbox = Operation.make({
  meta: {
    key: makeKey('analyzeMailbox'),
    name: 'Analyze Mailbox',
    description: 'Extracts RDF facts from every message in a mailbox feed into the shared space fact store.',
    icon: 'ph--brain--regular',
  },
  services: [AiService.AiService, Database.Service, FactStore, Trace.TraceService],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed messages are analyzed.',
    }),
    pageSize: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Number of messages processed per fact-store commit.',
      }),
    ),
    model: Schema.optional(
      Schema.String.annotate({ description: 'Extraction model DXN; defaults to the edge Claude model.' }),
    ),
    provider: Schema.optional(
      Schema.String.annotate({ description: 'AI provider id (e.g. ollama) for local extraction.' }),
    ),
    strict: Schema.optional(
      Schema.Boolean.annotate({ description: 'Strict structured output; set false for weak local models.' }),
    ),
  }),
  output: Schema.Struct({
    processed: Schema.Number,
    facts: Schema.Number,
  }),
});

/**
 * Progress key for a mailbox monitor: the mailbox URI plus a per-pipeline suffix, so the pipelines
 * coexist on one mailbox.
 *
 * The URI is pinned to the ABSOLUTE form. The producer (an operation, which resolves the mailbox
 * through `Database.load`) and the consumer (the article, holding the object from a space query)
 * derive the key independently, and the default `Obj.getURI` form follows how the object was
 * hydrated — a relative URI on one side and an absolute one on the other means the article looks up a
 * monitor name the sink never registered, and no meter appears.
 */
const createProgressKey = (mailbox: Mailbox.Mailbox, suffix: string) =>
  Obj.getURI(mailbox, { prefer: 'absolute' }).toString() + suffix;

/**
 * Progress-registry key for a mailbox's process-pipeline monitor — the mailbox URI plus `#process`,
 * so it coexists with the `#sync` monitor. `MailboxArticle` and the toolbar action subscribe to it.
 */
export const createProcessProgressKey = (mailbox: Mailbox.Mailbox) => createProgressKey(mailbox, '#process');

/** Progress-registry key for a mailbox's fact-analysis monitor ({@link AnalyzeMailbox}). */
export const createAnalyzeProgressKey = (mailbox: Mailbox.Mailbox) => createProgressKey(mailbox, '#analyze');

/** Progress-registry key for a mailbox's correspondent-extraction monitor ({@link ExtractCorrespondents}). */
export const createCorrespondentsProgressKey = (mailbox: Mailbox.Mailbox) =>
  createProgressKey(mailbox, '#correspondents');

/** Progress-registry key for a mailbox's pipeline-cascade monitor ({@link EnrichMailbox}). */
export const createEnrichProgressKey = (mailbox: Mailbox.Mailbox) => createProgressKey(mailbox, '#enrich');

/** Progress-registry key for a mailbox's summarization monitor ({@link SummarizeMailbox}). */
export const createSummarizeProgressKey = (mailbox: Mailbox.Mailbox) => createProgressKey(mailbox, '#summarize');

/** Hard per-run cap on messages summarized — one LLM call each, so the run must stay bounded. */
export const MAX_SUMMARIZE_MAILBOX_BATCH_LIMIT = 50;

/** Default number of messages summarized per run ({@link SummarizeMailbox}). */
export const DEFAULT_SUMMARIZE_MAILBOX_BATCH_LIMIT = 25;

export const SummarizeMailbox = Operation.make({
  meta: {
    key: makeKey('summarizeMailbox'),
    name: 'Summarize Mailbox',
    description:
      "Summarizes mail from known contacts into the mailbox's annotation feed, one immutable summary per message.",
    icon: 'ph--text-align-left--regular',
  },
  services: [AiService.AiService, Database.Service, Trace.TraceService],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed messages are summarized.',
    }),
    batchLimit: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Maximum messages summarized this run (hard-capped at 50).',
      }),
    ),
    contactsOnly: Schema.optional(
      Schema.Boolean.annotate({
        description:
          'Summarize only mail whose sender has a Person record (the default) — the funnel that makes this tier affordable.',
      }),
    ),
    model: Schema.optional(
      Schema.String.annotate({ description: 'Summarization model name; defaults to Claude Haiku.' }),
    ),
  }),
  output: Schema.Struct({
    /** Messages considered (after the contact gate and the already-summarized skip). */
    pending: Schema.Number,
    /** Summaries appended to the annotation feed this run. */
    summarized: Schema.Number,
    /** Messages still awaiting a summary beyond this run's batch limit. */
    remaining: Schema.Number,
  }),
}).pipe(Operation.idempotent);

/**
 * The cost classes {@link EnrichMailbox} runs, in cascade order. Each tier's output gates the next,
 * so the ordering is the contract — not a convenience:
 *
 * - `deterministic` — no LLM, no spend: contacts (the known-sender allow-list) and subscriptions.
 * - `classify` — cheap hosted model over every ungated message: spam verdict + category tags. The
 *   contacts from the previous tier are what keep known senders out of the model entirely.
 * - `summarize` — one LLM call per message, over contact mail only. The narrowest funnel and the
 *   highest value per call, which is why it sits behind the contact gate rather than beside it.
 * - `analyze` — per-message LLM fact extraction. Opt-in: unlike the tiers above it has no per-run
 *   batch cap, so it walks the whole feed.
 */
export const MailboxTier = Schema.Literals(['deterministic', 'classify', 'summarize', 'analyze']);
export type MailboxTier = Schema.Schema.Type<typeof MailboxTier>;

/**
 * Cascade order. Each tier consumes what the ones before it wrote, so this order — not the order the
 * caller happens to list — is the one {@link EnrichMailbox} runs in.
 */
export const MAILBOX_TIER_ORDER: readonly MailboxTier[] = ['deterministic', 'classify', 'summarize', 'analyze'];

/** Tiers run when the caller names none: the bounded ones (`analyze` walks the whole feed). */
export const DEFAULT_ENRICH_MAILBOX_TIERS: readonly MailboxTier[] = ['deterministic', 'classify', 'summarize'];

export const EnrichMailbox = Operation.make({
  meta: {
    key: makeKey('enrichMailbox'),
    name: 'Enrich Mailbox',
    description:
      'Runs the mailbox pipelines in cascade order — deterministic extraction, then cheap LLM classification, then optional per-message analysis.',
    icon: 'ph--stack-simple--regular',
  },
  // Only the orchestrator's own needs: each spawned operation resolves its own services (an AI tier
  // brings its own AiService), so the cascade itself stays runnable where no AI layer exists.
  services: [Database.Service, Trace.TraceService],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox every tier operates on.',
    }),
    me: Schema.optional(
      Schema.Array(Schema.String).annotate({
        description:
          "The user's own email addresses; without them the correspondent stage is skipped (nothing to derive).",
      }),
    ),
    tiers: Schema.optional(
      Schema.Array(MailboxTier).annotate({
        description:
          'Tiers to run — a set, not a sequence: they always run in cascade order. Defaults to the bounded tiers.',
      }),
    ),
    batchLimit: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Message cap for the classification tier (hard-capped at 100).',
      }),
    ),
    model: Schema.optional(
      Schema.String.annotate({ description: 'Model name for the LLM tiers; defaults per operation.' }),
    ),
    provider: Schema.optional(
      Schema.String.annotate({ description: 'AI provider id (e.g. ollama) for the analysis tier.' }),
    ),
    strict: Schema.optional(
      Schema.Boolean.annotate({
        description: 'Attempt strict structured output in the LLM tiers; set false for local models.',
      }),
    ),
    continueOnError: Schema.optional(
      Schema.Boolean.annotate({
        description:
          'Keep going after a failed stage. Off by default: a later tier consumes the previous one, so a partial cascade yields results computed against a stale gate.',
      }),
    ),
  }),
  output: Schema.Struct({
    completed: Schema.Number,
    failed: Schema.Number,
    skipped: Schema.Number,
    /** Per-stage outcome in run order — the spawned operation's own output, or why it did not run. */
    stages: Schema.Array(
      Schema.Struct({
        tier: MailboxTier,
        operation: Schema.String,
        status: Schema.Literals(['completed', 'failed', 'skipped', 'cancelled']),
        output: Schema.optional(Schema.Any),
        error: Schema.optional(Schema.String),
      }),
    ),
  }),
}).pipe(Operation.idempotent);

export const ExtractCorrespondents = Operation.make({
  meta: {
    key: makeKey('extractCorrespondents'),
    name: 'Extract Correspondents',
    description: 'Creates Person objects for everyone the user has sent or replied to, derived from the mailbox feed.',
    icon: 'ph--users--regular',
  },
  services: [Database.Service, Trace.TraceService],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed is scanned for correspondence.',
    }),
    me: Schema.Array(Schema.String).annotate({
      description: "The user's own email addresses (outbound sender / inbound recipient identities).",
    }),
  }),
  output: Schema.Struct({
    /** Feed messages scanned. */
    scanned: Schema.Number,
    /** Distinct correspondents derived from the feed. */
    correspondents: Schema.Number,
    /** Person objects created (existing contacts are never duplicated). */
    created: Schema.Number,
    /** Organization objects created for correspondents' corporate domains (never duplicated). */
    organizations: Schema.Number,
  }),
}).pipe(Operation.idempotent);

/** Default page size for {@link ProcessMailbox} cursor commits. */
export const DEFAULT_PROCESS_MAILBOX_PAGE_SIZE = 10;

export const ProcessMailbox = Operation.make({
  meta: {
    key: makeKey('processMailbox'),
    name: 'Process Mailbox',
    description:
      'Runs the cursored processing pipeline over the mailbox feed, resuming after the last processed message.',
    icon: 'ph--play--regular',
  },
  services: [Database.Service, Trace.TraceService],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed messages are processed.',
    }),
    pageSize: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Number of messages processed per cursor advance.',
      }),
    ),
  }),
  output: Schema.Struct({
    processed: Schema.Number,
  }),
}).pipe(Operation.idempotent);

export const ResetProcessCursor = Operation.make({
  meta: {
    key: makeKey('resetProcessCursor'),
    name: 'Reset Process Cursor',
    description: 'Clears a pipeline cursor so the next run re-processes the whole mailbox feed.',
    icon: 'ph--arrow-counter-clockwise--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose pipeline cursor is reset.',
    }),
    cursorId: Schema.optional(
      Schema.String.annotate({
        description: "Consumer cursor id to reset (e.g. 'classifyMailbox'); defaults to the process pipeline's.",
      }),
    ),
  }),
  output: Schema.Struct({
    /** False when no cursor existed yet (nothing to reset). */
    reset: Schema.Boolean,
  }),
}).pipe(Operation.idempotent);

/** Progress-registry key for a mailbox's classification monitor ({@link ClassifyMailbox}). */
export const createClassifyProgressKey = (mailbox: Mailbox.Mailbox) => createProgressKey(mailbox, '#classify');

/** Hard per-run cap on messages classified — LLM batches must stay bounded. */
export const MAX_CLASSIFY_MAILBOX_BATCH_LIMIT = 100;

/** Default number of messages classified per run ({@link ClassifyMailbox}). */
export const DEFAULT_CLASSIFY_MAILBOX_BATCH_LIMIT = 100;

/** Default number of messages classified per LLM call. */
export const DEFAULT_CLASSIFY_MAILBOX_PAGE_SIZE = 20;

export const ClassifyMailbox = Operation.make({
  meta: {
    key: makeKey('classifyMailbox'),
    name: 'Classify Mailbox',
    description:
      'LLM spam detection and category labeling over the mailbox feed; senders with a known Person are never spam.',
    icon: 'ph--shield-check--regular',
  },
  services: [AiService.AiService, Database.Service, Trace.TraceService],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed messages are classified.',
    }),
    batchLimit: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Maximum messages classified this run (hard-capped at 100).',
      }),
    ),
    pageSize: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Messages per LLM call (and per cursor advance).',
      }),
    ),
    model: Schema.optional(
      Schema.String.annotate({ description: 'Classification model name; defaults to Claude Haiku.' }),
    ),
    strict: Schema.optional(
      Schema.Boolean.annotate({
        description:
          'Attempt strict structured output before the lenient JSON-salvage path; set false for providers that never honor it (saves one generation per page).',
      }),
    ),
  }),
  output: Schema.Struct({
    /** Messages classified this run (LLM + known-person shortcut). */
    processed: Schema.Number,
    /** Messages tagged spam. */
    spam: Schema.Number,
    /** Messages short-circuited by a known-Person sender (tagged personal, never spam). */
    known: Schema.Number,
    /** Messages still pending beyond this run's batch limit. */
    remaining: Schema.Number,
  }),
}).pipe(Operation.idempotent);

export const CreateProjectFromMessage = Operation.make({
  meta: {
    key: makeKey('createProjectFromMessage'),
    name: 'Create Project',
    description: "Creates a Project seeded from a message's thread, with an LLM summary.",
    icon: 'ph--stack--regular',
  },
  services: [AiService.AiService, Database.Service],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox the message belongs to; the created project is anchored to it.',
    }),
    message: Type.getSchema(Message.Message).annotate({
      description: 'Message whose thread seeds the project.',
    }),
  }),
  output: Schema.Struct({
    projectId: Schema.String,
  }),
});

/** Progress-registry key for a mailbox's subscription-extraction monitor ({@link ExtractSubscriptions}). */
export const createSubscriptionsProgressKey = (mailbox: Mailbox.Mailbox) =>
  createProgressKey(mailbox, '#subscriptions');

export const ExtractSubscriptions = Operation.make({
  meta: {
    key: makeKey('extractSubscriptions'),
    name: 'Extract Subscriptions',
    description:
      'Extracts unsubscribe links (header and body) from the mailbox feed and records the per-sender subscriptions on the mailbox.',
    icon: 'ph--link--regular',
  },
  services: [Database.Service, Trace.TraceService],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed is scanned and whose subscriptions record is replaced.',
    }),
  }),
  output: Schema.Struct({
    /** Feed messages scanned. */
    scanned: Schema.Number,
    /** Messages carrying an unsubscribe affordance (header or body). */
    matched: Schema.Number,
    /** Distinct subscriptions recorded on the mailbox. */
    subscriptions: Schema.Number,
  }),
}).pipe(Operation.idempotent);

export const UnsubscribeSender = Operation.make({
  meta: {
    key: makeKey('unsubscribeSender'),
    name: 'Unsubscribe',
    description: 'Adds a skip-sender filter and fires the List-Unsubscribe one-click request for a bulk sender.',
    icon: 'ph--prohibit--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({ description: 'Mailbox to add the skip-sender filter to.' }),
    email: Schema.String.annotate({ description: 'Sender email to unsubscribe from and filter.' }),
    unsubscribe: Schema.String.annotate({ description: 'The raw List-Unsubscribe header value.' }),
  }),
  output: Schema.Struct({
    filtered: Schema.Boolean,
    /** True when a List-Unsubscribe one-click HTTP request was sent successfully. */
    unsubscribed: Schema.Boolean,
  }),
});

/** Default number of thread messages included in the {@link GenerateReply} prompt. */
export const DEFAULT_GENERATE_REPLY_THREAD_LIMIT = 5;

/** Default maximum number of facts included in the {@link GenerateReply} prompt. */
export const DEFAULT_GENERATE_REPLY_FACT_LIMIT = 20;

export const GenerateReply = Operation.make({
  meta: {
    key: makeKey('generateReply'),
    name: 'Generate Reply',
    description:
      'Drafts a reply to an email, grounded on the thread context and facts the space fact store knows about the participants.',
    icon: 'ph--sparkle--regular',
  },
  services: [AiService.AiService, Database.Service, FactStore],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed holds the thread.',
    }),
    message: Schema.Any.annotate({
      description: 'The message to reply to.',
    }),
  }),
  output: Schema.Struct({
    subject: Schema.String,
    body: Schema.String,
  }),
});
