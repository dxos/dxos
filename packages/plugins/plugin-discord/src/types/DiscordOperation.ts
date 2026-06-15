//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Ref, DXN } from '@dxos/echo';
import { Integration } from '@dxos/plugin-integration';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

/** Wire-shape of a `RemoteTarget` for `GetDiscordChannels.output`. */
const RemoteTarget = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String.pipe(Schema.optional),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(Schema.optional),
});

/**
 * Discovery only — list Discord text channels across every guild the bot
 * belongs to and return one descriptor per channel.
 *
 * Read-only: returns one row per remote channel, NEVER creates a local
 * `Channel`. Materialization happens lazily in `SyncDiscordChannel` on first
 * sync of a target, so unselected channels leave no trace in the space.
 */
export const GetDiscordChannels = Operation.make({
  meta: {
    key: makeKey('getDiscordChannels'),
    name: 'Get Discord Channels',
    description: 'List Discord text channels reachable from an integration without materializing local Channels.',
    icon: 'ph--hash--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Struct({
    targets: Schema.Array(RemoteTarget),
  }),
});

/**
 * Pull-only sync of currently-selected Discord targets in an Integration.
 *
 * For each selected channel: load (or create) a local `Channel` keyed by the
 * Discord channel id, ask Discord for messages newer than `target.cursor`,
 * and append them to the channel's feed as `@dxos/types` `Message` objects.
 */
export const SyncDiscordChannel = Operation.make({
  meta: {
    key: makeKey('syncDiscordChannel'),
    name: 'Sync Discord Channel',
    description: 'Reconcile messages for currently-selected Discord targets in an Integration.',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
    /** Optional: narrow to a single target Channel. */
    channel: Ref.Ref(Obj.Unknown).pipe(Schema.optional),
  }),
  output: Schema.Struct({
    pulled: Schema.Struct({
      added: Schema.Number,
    }),
  }),
});
