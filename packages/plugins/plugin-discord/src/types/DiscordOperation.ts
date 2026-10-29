//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
import * as CrawlState from '@dxos/crawler/CrawlState';
import { Database, DXN, Feed, Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as FactFeed from '@dxos/plugin-agent/FactFeed';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { DISCORD_PROVIDER_ID, DISCORD_USER_PROVIDER_ID } from '../constants.ts';

/**
 * Discovery only - list Discord text channels across every guild the
 * connection's token can reach and return one descriptor per channel.
 *
 * Read-only: returns one row per remote channel, NEVER creates a local
 * `Channel`. Local Channels are materialized eagerly when a binding is created
 * (see `materializeTarget`), so unselected channels leave no trace in the space.
 */
export const GetDiscordChannels = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.getChannels'),
    name: 'Get Discord Channels',
    description: 'List Discord text channels reachable from a connection without materializing local Channels.',
    icon: 'ph--hash--regular',
  },
  services: [Capability.Service, Credential.CredentialsService],
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

/**
 * Find-or-create the empty local feed-backed `Channel` for a selected Discord
 * channel so a `Cursor.Cursor` can reference it as its sync target.
 * Keyed by the Discord channel id foreign key, so it is idempotent across
 * re-selection.
 */
export const MaterializeDiscordTarget = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.materializeTarget'),
    name: 'Materialize Discord Target',
    description: 'Create the empty local Channel bound to a selected Discord channel.',
    icon: 'ph--hash--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

/**
 * Pull-only sync of every Discord channel bound to a connection.
 *
 * Fans out over the connection's external-sync cursors (see `Binding.syncAll`):
 * for each binding, asks Discord for messages newer than `binding.max`, maps each into
 * a `@dxos/types` `Message`, and appends them to the bound Channel's feed. Updates each
 * binding's `max`/`lastTick`/`lastError`.
 */
export const SyncDiscordChannel = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.syncChannel'),
    name: 'Sync Discord Channel',
    description: 'Reconcile messages for every Discord channel bound to a connection.',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Credential.CredentialsService],
  input: ConnectorSpec.SyncInput,
  output: Schema.Struct({
    pulled: Schema.Struct({
      added: Schema.Number,
    }),
  }),
}).pipe(Operation.visible);

/** Whether a connection is a Discord one a back-index can read with: a user OAuth sign-in, or a bot token. */
export const isDiscordConnection = (connection: Connection.Connection): boolean =>
  connection.connectorId === DISCORD_USER_PROVIDER_ID || connection.connectorId === DISCORD_PROVIDER_ID;

/** Messages one crawl step reads and one model request extracts: a Discord page. */
export const BACK_INDEX_PAGE_SIZE = 25;

/**
 * Crawl steps (a page each) one invocation runs by default: EDGE bounds an invocation to a minute, and each page may
 * cost a model request.
 */
export const DEFAULT_BACK_INDEX_STEPS = 2;

/** How often the back-index trigger runs by default: every two minutes. */
export const DEFAULT_BACK_INDEX_CRON = '*/2 * * * *';

const CrawlConfigFields = {
  connection: Ref.Ref(Connection.Connection).annotate({
    description: 'The Discord connection whose token (from the space) reads the channels.',
  }),
  channels: Schema.Array(Schema.String).annotate({ description: 'Top-level Discord channel ids to crawl.' }),
  descendThreads: Schema.optional(
    Schema.Boolean.annotate({ description: 'Whether threads in the channels are crawled too; defaults to true.' }),
  ),
  maxDays: Schema.optional(
    Schema.Number.annotate({ description: 'Lookback in days for a channel crawled for the first time.' }),
  ),
  maxDepth: Schema.optional(
    Schema.Number.annotate({ description: 'How deep threads are descended; unbounded when absent.' }),
  ),
  maxSteps: Schema.optional(
    Schema.Number.annotate({
      description: `Crawl steps (a page each) one invocation runs; ${DEFAULT_BACK_INDEX_STEPS} when absent.`,
    }),
  ),
};

/**
 * One bounded run of a Discord back-index: reconciles the crawl's frontier with `channels`, reads up to `maxSteps`
 * pages from the targets' cursors with the space's Discord token, extracts each page's facts in one model request and
 * appends them to the fact feed `facts`. Every bit of progress lives in the {@link CrawlState.CrawlState} `state`, so
 * a trigger invoking it on a schedule continues where the last run stopped, and a message read again unchanged costs
 * no model call. Writes the run's status, outcome and error into `state` rather than failing, so they persist.
 */
export const CrawlDiscordChannels = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.crawlChannels'),
    name: 'Crawl Discord Channels',
    description: 'Back-index Discord channels into a fact feed, a bounded number of pages per run.',
    icon: 'ph--bulldozer--regular',
  },
  services: [AiService.AiService, Credential.CredentialsService, Database.Service],
  types: [CrawlState.CrawlState, Connection.Connection, FactFeed.FactItem],
  input: Schema.Struct({
    ...CrawlConfigFields,
    state: Ref.Ref(CrawlState.CrawlState).annotate({ description: 'The durable state of this crawl.' }),
    facts: Ref.Ref(Feed.Feed).annotate({ description: 'The fact feed extracted facts are appended to.' }),
  }),
  output: Schema.Struct({
    done: Schema.Boolean,
    errored: Schema.Number,
    steps: Schema.Number,
    messages: Schema.Number,
    error: Schema.optional(Schema.String),
  }),
});

/**
 * Creates or updates a Discord back-index: its {@link CrawlState.CrawlState}, its fact feed, and the remote timer
 * trigger that runs {@link CrawlDiscordChannels} on EDGE. With `trigger`, that back-index is reconfigured in place
 * (the trigger's input names its state and feed); without, all three are created. Crawling is configured here and
 * nowhere else: an agent's brain only consumes the resulting fact feed.
 */
export const ConfigureBackIndex = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.configureBackIndex'),
    name: 'Configure Discord Back-Index',
    description: 'Create or update the crawl state, fact feed and schedule of a Discord back-index.',
    icon: 'ph--bulldozer--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    ...CrawlConfigFields,
    trigger: Schema.optional(
      Ref.Ref(Trigger.Trigger).annotate({ description: 'The back-index to reconfigure; a new one when absent.' }),
    ),
    name: Schema.optional(Schema.String.annotate({ description: 'Names a new crawl state and fact feed.' })),
    cron: Schema.optional(
      Schema.String.annotate({ description: `How often it runs; \`${DEFAULT_BACK_INDEX_CRON}\` when absent.` }),
    ),
    enabled: Schema.optional(Schema.Boolean.annotate({ description: 'Whether it runs; true when absent.' })),
  }),
  output: Schema.Struct({
    trigger: Ref.Ref(Trigger.Trigger),
    state: Ref.Ref(CrawlState.CrawlState),
    facts: Ref.Ref(Feed.Feed),
  }),
});
