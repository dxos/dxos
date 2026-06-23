//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Ref, DXN } from '@dxos/echo';
import { GetSyncTargetsInput, GetSyncTargetsOutput, SyncBinding } from '@dxos/plugin-connector';

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
