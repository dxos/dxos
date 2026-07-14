//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { Connection, MaterializeTargetInput, MaterializeTargetOutput } from '@dxos/plugin-connector';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/** Wire-shape of a `RemoteTarget` for `GetSlackChannels.output`. */
const RemoteTarget = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String.pipe(Schema.optional),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(Schema.optional),
});

/**
 * Discovery only — list Slack conversations (channels, DMs, group DMs)
 * reachable from a connection's token.
 *
 * Read-only: returns one descriptor per remote conversation, NEVER creates a
 * local Channel. Materialization happens via `materializeTarget` when a
 * binding is created, so unselected conversations leave no trace in the space.
 */
export const GetSlackChannels = Operation.make({
  meta: {
    key: makeKey('getSlackChannels'),
    name: 'Get Slack Channels',
    description: 'List Slack conversations reachable from a connection without materializing local Channels.',
    icon: 'ph--slack-logo--regular',
  },
  // Database.Service is provided inside the handler from the connection's
  // database and the resolved space's queues — same pattern as plugin-thread's `AppendChannelMessage`.
  services: [Capability.Service],
  input: Schema.Struct({
    connection: Ref.Ref(Connection.Connection),
  }),
  output: Schema.Struct({
    targets: Schema.Array(RemoteTarget),
  }),
});

/**
 * Find-or-create the empty local `Channel` root for a selected Slack
 * conversation so a {@link Cursor.Cursor} can be created eagerly against it.
 * Keyed by the conversation's `externalId` foreign key, so it is idempotent
 * across re-selection.
 */
export const MaterializeSlackTarget = Operation.make({
  meta: {
    key: makeKey('materializeSlackTarget'),
    name: 'Materialize Slack Target',
    description: 'Create the empty local Channel bound to a selected Slack conversation.',
    icon: 'ph--slack-logo--regular',
  },
  input: MaterializeTargetInput,
  output: MaterializeTargetOutput,
});

/**
 * Pull-only sync of a single Slack channel binding.
 *
 * Resolves the binding's credential (`spec.source`) and local `Channel`
 * (`spec.target`), asks Slack for messages newer than the binding's `value`,
 * and appends them to the channel's feed as `@dxos/types` `Message` objects.
 * `Message.threadId` carries Slack's `thread_ts` so threaded replies are
 * reconstructable on read without a separate object type. The new cursor
 * value / `lastTick` / `lastError` are written back onto the binding.
 */
export const SyncSlackChannel = Operation.make({
  meta: {
    key: makeKey('syncSlackChannel'),
    name: 'Sync Slack Channel',
    description: 'Reconcile messages for a single Slack channel binding.',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    binding: Ref.Ref(Cursor.Cursor),
  }),
  output: Schema.Struct({
    pulled: Schema.Struct({
      added: Schema.Number,
    }),
  }),
}).pipe(Operation.visible);
