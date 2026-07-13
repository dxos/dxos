//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN, Ref } from '@dxos/echo';
import {
  Connection,
  GetSyncTargetsInput,
  GetSyncTargetsOutput,
  MaterializeTargetInput,
  MaterializeTargetOutput,
  SyncBinding,
} from '@dxos/plugin-connector';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

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
    key: makeKey('getDiscordChannels'),
    name: 'Get Discord Channels',
    description: 'List Discord text channels reachable from a connection without materializing local Channels.',
    icon: 'ph--hash--regular',
  },
  services: [Capability.Service],
  input: GetSyncTargetsInput,
  output: GetSyncTargetsOutput,
});

/**
 * Find-or-create the empty local feed-backed `Channel` for a selected Discord
 * channel so a {@link SyncBinding} relation can be created eagerly (relations
 * require both endpoints to exist). Keyed by the Discord channel id foreign
 * key, so it is idempotent across re-selection.
 */
export const MaterializeDiscordTarget = Operation.make({
  meta: {
    key: makeKey('materializeDiscordTarget'),
    name: 'Materialize Discord Target',
    description: 'Create the empty local Channel bound to a selected Discord channel.',
    icon: 'ph--hash--regular',
  },
  input: MaterializeTargetInput,
  output: MaterializeTargetOutput,
});

/**
 * Pull-only sync of the single Discord channel bound by a {@link SyncBinding}.
 *
 * Loads the binding, asks Discord for messages newer than `binding.cursor`,
 * maps each into a `@dxos/types` `Message`, and appends them to the bound
 * Channel's feed. Updates the binding's `cursor`/`lastSyncAt`/`lastError`.
 */
export const SyncDiscordChannel = Operation.make({
  meta: {
    key: makeKey('syncDiscordChannel'),
    name: 'Sync Discord Channel',
    description: 'Reconcile messages for the Discord channel bound by a SyncBinding.',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    binding: Ref.Ref(SyncBinding.SyncBinding),
  }),
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
    key: makeKey('crawlDiscordChannels'),
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
