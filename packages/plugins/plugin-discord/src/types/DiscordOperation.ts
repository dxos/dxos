//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN, Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

/**
 * Discovery only — list Discord text channels across every guild the
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
  services: [Capability.Service],
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
  input: ConnectorSpec.SyncInput,
  output: Schema.Struct({
    pulled: Schema.Struct({
      added: Schema.Number,
    }),
  }),
}).pipe(Operation.visible);

/**
 * Incremental crawl of a set of Discord channels (optionally descending threads) through the
 * `DiscordPipeline`: messages land in the session SQLite store, facts in the fact graph, and open
 * questions are attempted as targets drain. Separate from feed sync — nothing is written to ECHO.
 * Resumable: re-invoking continues from the per-target durable cursors.
 */
export const CrawlDiscordChannels = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.crawlChannels'),
    name: 'Crawl Discord Channels',
    description: 'Incrementally crawl Discord channels through the fact-extraction pipeline.',
    icon: 'ph--bulldozer--regular',
  },
  services: [Capability.Service, AiService.AiService],
  input: Schema.Struct({
    connection: Ref.Ref(Connection.Connection),
    channels: Schema.Array(Schema.String),
    descendThreads: Schema.optional(Schema.Boolean),
    maxDays: Schema.optional(Schema.Number),
    maxSteps: Schema.optional(Schema.Number),
    /** Standing questions to register before the crawl (idempotent by text). */
    questions: Schema.optional(Schema.Array(Schema.String)),
  }),
  output: Schema.Struct({
    done: Schema.Boolean,
    errored: Schema.Number,
    steps: Schema.Number,
  }),
});
