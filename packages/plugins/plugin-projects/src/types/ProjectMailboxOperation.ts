//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { Message } from '@dxos/types';

/**
 * Mailbox pipelines that contribute to a project (see `operations/mailbox/`): each scans the
 * mailbox feed and creates/updates an artifact owned by the project. Designed as routine
 * runnables — a project's routine binds one of these (kind: runnable) on a feed or timer trigger.
 *
 * Their own module because they are the only project verbs that reach into another plugin
 * (`@dxos/plugin-inbox`) and the model (`@dxos/ai`); the project skill drives none of them, so
 * `ProjectOperation` stays free of that graph.
 *
 * TODO(wittjosiah): Consider moving these to `plugin-inbox` instead. A project is the core piece a
 * mailbox contributes to, not the other way around, and these read like the inbox's verbs for
 * feeding one: this plugin depends on `plugin-inbox` for them, so the dependency would invert to
 * match. What argues for keeping them: their keys are in the `projects` domain, they write a
 * project's task set and artifacts, and `CreateTrackingProject` creates the project itself.
 */

/**
 * Scans a mailbox feed and files one task per matching message, idempotently: re-running must not
 * resurrect a task the user completed or edited. Reading a feed and reconciling against existing
 * tasks is not something a generic create expresses.
 */
export const UpdateProjectTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.updateTasks'),
    name: 'Update Project Tasks',
    description:
      "Tracks requests from the given senders as tasks in the project's task set (one task per message, idempotent).",
    icon: 'ph--check-square-offset--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotate({ description: 'Project whose task set receives the tasks.' }),
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({ description: 'Mailbox whose feed is scanned.' }),
    senders: Schema.Array(Schema.String).annotate({
      description: 'Sender email addresses or bare domains whose messages are tracked as requests.',
    }),
  }),
  output: Schema.Struct({
    scanned: Schema.Number,
    matched: Schema.Number,
    /** Tasks created this run (existing tasks are never duplicated). */
    created: Schema.Number,
  }),
}).pipe(Operation.idempotent, Operation.mutation('write'));

/**
 * Scans a mailbox feed for itinerary mail and maintains the project's travel-log artifact — a
 * derived document rewritten from the feed, not a field a generic update could patch.
 */
export const UpdateTravelLog = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.updateTravelLog'),
    name: 'Update Travel Log',
    description:
      "Regenerates the project's Travel Bookings document from the travel-service messages in the mailbox feed.",
    icon: 'ph--airplane-tilt--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotate({ description: 'Project owning the Travel Bookings artifact.' }),
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({ description: 'Mailbox whose feed is scanned.' }),
  }),
  output: Schema.Struct({
    scanned: Schema.Number,
    /** Travel messages found (rows in the regenerated document). */
    matched: Schema.Number,
  }),
}).pipe(Operation.idempotent, Operation.mutation('write'));

/**
 * Scans a mailbox feed and asks the model to maintain the project's investor log. The only project
 * verb that needs `AiService`: the artifact's content is generated, not copied.
 */
export const UpdateInvestorLog = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.updateInvestorLog'),
    name: 'Update Investor Log',
    description:
      "Extracts contacts for investor-domain senders and regenerates the project's Investor Conversations document (one section per thread, optional LLM summaries).",
    icon: 'ph--handshake--regular',
  },
  services: [AiService.AiService, Database.Service],
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotate({
      description: 'Project owning the Investor Conversations artifact.',
    }),
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({ description: 'Mailbox whose feed is scanned.' }),
    domains: Schema.Array(Schema.String).annotate({
      description: 'Investor email addresses or bare domains to track.',
    }),
    summarize: Schema.optional(
      Schema.Boolean.annotate({
        description: 'Generate an LLM summary per conversation; defaults to a deterministic digest.',
      }),
    ),
    model: Schema.optional(Schema.String.annotate({ description: 'Summary model name; defaults to Claude Haiku.' })),
  }),
  output: Schema.Struct({
    scanned: Schema.Number,
    matched: Schema.Number,
    threads: Schema.Number,
    /** Person objects created for investor senders (never duplicated). */
    contacts: Schema.Number,
  }),
}).pipe(Operation.idempotent, Operation.mutation('write'));

/**
 * Who the project follows, derived from the seed message:
 *
 * - `domain` — the sender's organization (them and their colleagues); falls back to the individual
 *   for a free-mail sender, whose domain identifies no organization.
 * - `sender` — that person only.
 */
export const TrackingScope = Schema.Literals(['domain', 'sender']);
export type TrackingScope = Schema.Schema.Type<typeof TrackingScope>;

/**
 * The pipeline the project's routine runs over the tracked mail. Each names an operation to bind as
 * the routine's runnable — this is what "a project is a policy over pipelines" means concretely: the
 * capability is mailbox-global, the project fixes its scope, its artifacts and its schedule.
 */
export const TrackingPipeline = Schema.Literals(['tasks', 'summaries', 'contacts']);
export type TrackingPipeline = Schema.Schema.Type<typeof TrackingPipeline>;

/**
 * Scaffolds the whole tracking setup from one message: a project, the routine that binds a pipeline
 * below to a feed trigger, and a backfill over the mail already there. Several objects and a
 * trigger binding, where a generic create makes one object.
 */
export const CreateTrackingProject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.createTracking'),
    name: 'Create Tracking Project',
    description:
      "Creates a project that follows a message's sender (or their whole domain): scaffolds the project, wires a feed-triggered routine binding the chosen pipeline, and backfills from the existing feed.",
    icon: 'ph--stack-plus--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({ description: 'Mailbox the project tracks.' }),
    message: Type.getSchema(Message.Message).annotate({
      description: 'Message whose sender seeds the project.',
    }),
    scope: Schema.optional(TrackingScope).annotate({
      description: "Who to follow; defaults to the sender's domain when it identifies an organization.",
    }),
    pipeline: Schema.optional(TrackingPipeline).annotate({
      description: 'Pipeline the scaffolded routine runs; defaults to request tracking (tasks).',
    }),
    name: Schema.optional(Schema.String).annotate({ description: 'Project name; defaults from the scope.' }),
  }),
  output: Schema.Struct({
    projectId: Schema.String,
    /** The sender entries (domain or address) the project tracks. */
    senders: Schema.Array(Schema.String),
    /** The pipeline bound to the project's routine. */
    pipeline: TrackingPipeline,
    /** Tasks created by the initial backfill (task pipeline only). */
    tasks: Schema.Number,
  }),
}).pipe(Operation.mutation('write'));
