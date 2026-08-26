//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Collection, Database, DXN, Obj, Ref, Type } from '@dxos/echo';
// Person is referenced in Actor.Actor's inferred type (via ExtractContact); importing it allows
// TypeScript to name it in the emitted .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Actor, Event, Message, type Person } from '@dxos/types';
import { AI_ACTION_ICON } from '@dxos/ui-types';

import * as Mailbox from './Mailbox';

export const AddMailbox = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.inbox.addMailbox'),
    name: 'Add Mailbox',
    icon: 'ph--envelope--regular',
  },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    object: Obj.Unknown,
    // The database comes from the invocation's space id, never from the input; absent, the mailbox
    // is filed at the space root.
    target: Schema.optional(Type.getSchema(Collection.Collection)),
  }),
  output: Schema.Struct({
    id: Schema.String,
    subject: Schema.Array(Schema.String),
    object: Obj.Unknown,
  }),
});

export const DraftEmail = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.inbox.draftEmail'),
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
    key: DXN.make('org.dxos.operation.inbox.draftEmailAndOpen'),
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

/**
 * Eagerly materializes the local Mailbox bound to a Gmail connection so the sync cursor's target
 * exists before the cursor is created. Gmail is a single-target connector with no remote selection,
 * so a fresh Mailbox is always created; the connection's `accessToken.account` seeds the default name.
 */
/**
 * Eagerly materializes the local Mailbox bound to a JMAP connection so the sync cursor's target
 * exists before the cursor is created. JMAP is a single-target connector (the account inbox), so a
 * fresh Mailbox is always created; the connection's `accessToken.account` seeds the default name.
 * Mirrors {@link MaterializeGmailTarget}.
 */
/**
 * Eagerly materializes the local Calendar for a selected remote Google calendar so the sync
 * cursor's target exists before the cursor is created. Find-or-create keyed on the calendar's
 * foreign key, so re-running for the same remote calendar returns the existing Calendar.
 */
/**
 * Create a single event on Google Calendar (the write counterpart to {@link GoogleCalendarSync}, and
 * the calendar analogue of {@link GmailSend}). Sources credentials from the Integration.
 */
export const RenameFilter = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.inbox.renameFilter'),
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

export const ReadEmail = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.inbox.readEmail'),
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
    key: DXN.make('org.dxos.operation.inbox.classifyEmail'),
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
  meta: {
    key: DXN.make('org.dxos.operation.inbox.extractContact'),
    name: 'Extract Contact',
    icon: 'ph--user--regular',
  },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    db: Database.Database,
    actor: Actor.Actor,
    /**
     * Mailbox whose messages from this sender get labelled `important` once the contact exists.
     * Optional: tagging lives in the mailbox's index, so a caller without one just creates the Person.
     */
    mailbox: Schema.optional(Ref.Ref(Mailbox.Mailbox)),
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
    key: DXN.make('org.dxos.operation.inbox.extractContactFromMessage'),
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
    key: DXN.make('org.dxos.operation.inbox.extractSummaryFromMessage'),
    name: 'Extract Summary from Message',
    icon: 'ph--text-aa--regular',
  },
  services: [Capability.Service, AiService.AiService],
  input: ExtractInputSchema,
  output: ExtractResultSchema,
});

export const ExtractMessage = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.inbox.extractMessage'), name: 'Extract Message' },
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
    key: DXN.make('org.dxos.operation.inbox.extractMailbox'),
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
 * Progress-registry key for a mailbox's fact-extraction monitor.
 *
 * The operation moved to plugin-brain, but the key stays here with its siblings: it is derived from
 * the mailbox URI, and every monitor key on a mailbox must be minted the same way or the producer and
 * the article compute different names and no meter appears. Named for the facts it extracts rather
 * than its tier, since the cascade that runs it is now {@link AnalyzeMailbox}.
 */
export const createFactsProgressKey = (mailbox: Mailbox.Mailbox) => createProgressKey(mailbox, '#facts');

/** Progress-registry key for a mailbox's correspondent-extraction monitor ({@link ExtractCorrespondents}). */
export const createCorrespondentsProgressKey = (mailbox: Mailbox.Mailbox) =>
  createProgressKey(mailbox, '#correspondents');

/** Progress-registry key for a mailbox's pipeline-cascade monitor ({@link AnalyzeMailbox}). */
export const createAnalyzeProgressKey = (mailbox: Mailbox.Mailbox) => createProgressKey(mailbox, '#analyze');

/** Progress-registry key for a mailbox's summarization monitor ({@link SummarizeMailbox}). */
export const createSummarizeProgressKey = (mailbox: Mailbox.Mailbox) => createProgressKey(mailbox, '#summarize');

/** Hard per-run cap on messages summarized — one LLM call each, so the run must stay bounded. */
export const MAX_SUMMARIZE_MAILBOX_BATCH_LIMIT = 50;

/** Default number of messages summarized per run ({@link SummarizeMailbox}). */
export const DEFAULT_SUMMARIZE_MAILBOX_BATCH_LIMIT = 25;

export const SummarizeMailbox = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.inbox.summarizeMailbox'),
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
 * The cost classes {@link AnalyzeMailbox} runs. Each tier's output gates the next,
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
 * Tiers run when the caller names none: the bounded ones (`analyze` walks the whole feed).
 *
 * A tier SELECTS which processors run, never their order — that comes from the `after` edges each
 * processor declares, so a caller listing tiers backwards still gets the cascade order.
 */
export const DEFAULT_ANALYZE_MAILBOX_TIERS: readonly MailboxTier[] = ['deterministic', 'classify', 'summarize'];

export const AnalyzeMailbox = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.inbox.analyzeMailbox'),
    name: 'Analyze Mailbox',
    description:
      'Runs the mailbox pipelines in cascade order — deterministic extraction, then cheap LLM classification, then optional per-message analysis.',
    icon: AI_ACTION_ICON,
  },
  // Only the orchestrator's own needs: each spawned operation resolves its own services (an AI tier
  // brings its own AiService), so the cascade itself stays runnable where no AI layer exists.
  // `Capability.Service` is the exception it cannot do without — the processors it runs are read from
  // a capability, so without it there is no topology to resolve.
  services: [Capability.Service, Database.Service, Trace.TraceService],
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
    /** Passes that never ran because the cascade was interrupted — distinct from skipped. */
    cancelled: Schema.Number,
    /** Per-processor outcome in run order — the spawned operation's own output, or why it did not run. */
    stages: Schema.Array(
      Schema.Struct({
        tier: MailboxTier,
        /** The contributed processor's id — its topology key and its cursor tag. */
        processor: Schema.String,
        /** URI of what this run was about; several entries share a processor when it covers N subjects. */
        subject: Schema.optional(Schema.String),
        status: Schema.Literals(['completed', 'failed', 'skipped', 'cancelled']),
        output: Schema.optional(Schema.Any),
        error: Schema.optional(Schema.String),
      }),
    ),
  }),
}).pipe(Operation.idempotent);

export const ExtractCorrespondents = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.inbox.extractCorrespondents'),
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

/**
 * Clears one consumer's feed cursor. Generic rather than pipeline-specific: several pipelines keep
 * their own tagged cursor on the same feed (`classifyMailbox`, …), and each needs a way to start over.
 */
export const ResetFeedCursor = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.inbox.resetFeedCursor'),
    name: 'Reset Feed Cursor',
    description: "Clears a pipeline's cursor so its next run reprocesses the whole mailbox feed.",
    icon: 'ph--arrow-counter-clockwise--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose pipeline cursor is reset.',
    }),
    // Required: defaulting it silently reset whichever pipeline happened to own the default tag.
    cursorId: Schema.String.annotate({
      description: "Consumer cursor id to reset (e.g. 'classifyMailbox').",
    }),
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
    key: DXN.make('org.dxos.operation.inbox.classifyMailbox'),
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
    key: DXN.make('org.dxos.operation.inbox.createProjectFromMessage'),
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
    key: DXN.make('org.dxos.operation.inbox.extractSubscriptions'),
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
    key: DXN.make('org.dxos.operation.inbox.unsubscribeSender'),
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
