//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { Integration } from '@dxos/plugin-integration';

import { meta } from '#meta';

const SLACK_OPERATION = `${meta.id}.operation`;

/** Wire-shape of a `RemoteTarget` for `GetSlackChannels.output`. */
const RemoteTarget = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String.pipe(Schema.optional),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(Schema.optional),
});

/**
 * Discovery only — list Slack conversations (channels, DMs, group DMs)
 * reachable from the integration's token.
 *
 * Read-only: returns one descriptor per remote conversation, NEVER creates a
 * local Channel. Materialization happens lazily in `SyncSlackChannel` on first
 * sync of a target, so unselected conversations leave no trace in the space.
 */
export const GetSlackChannels = Operation.make({
  meta: {
    key: `${SLACK_OPERATION}.get-slack-channels`,
    name: 'Get Slack Channels',
    description: 'List Slack conversations reachable from an integration without materializing local Channels.',
    icon: 'ph--slack-logo--regular',
  },
  // Database.Service / Feed.FeedService are provided inside the handler from
  // the integration's database and the resolved space's queues — same pattern
  // as plugin-thread's `AppendChannelMessage`.
  services: [Capability.Service],
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Struct({
    targets: Schema.Array(RemoteTarget),
  }),
});

/**
 * Pull-only sync of currently-selected Slack targets in an Integration.
 *
 * For each selected conversation: load (or create) a local `Channel` keyed by
 * the Slack conversation id, ask Slack for messages newer than
 * `target.cursor`, and append them to the channel's feed as `@dxos/types`
 * `Message` objects. `Message.threadId` carries Slack's `thread_ts` so
 * threaded replies are reconstructable on read without a separate object
 * type.
 */
export const SyncSlackChannel = Operation.make({
  meta: {
    key: `${SLACK_OPERATION}.sync-slack-channel`,
    name: 'Sync Slack Channel',
    description: 'Reconcile messages for currently-selected Slack targets in an Integration.',
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
