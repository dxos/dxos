//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

/** Slack connection status. */
export type SlackConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Slack channel info from the API. */
export type SlackChannel = {
  id: string;
  name: string;
  isMember: boolean;
};

/** Slack settings persisted per-plugin. */
export namespace SlackCapabilities {
  export const SettingsSchema = Schema.mutable(
    Schema.Struct({
      /** Bot token for Slack API access. */
      botToken: Schema.optional(Schema.String),
      /** Channels the agent monitors. */
      monitoredChannels: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
      /** Whether to respond to @mentions. */
      respondToMentions: Schema.optional(Schema.Boolean),
      /** Whether to respond to DMs. */
      respondToDMs: Schema.optional(Schema.Boolean),
    }),
  );

  export type Settings = Schema.Schema.Type<typeof SettingsSchema>;

  export const Settings = Capability.make<import('@effect-atom/atom').Atom.Writable<Settings>>(
    `${meta.id}.capability.settings`,
  );
}
