//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

/** Telegram connection status. */
export type TelegramConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Telegram chat info discovered from incoming messages. */
export type TelegramChat = {
  id: number;
  title: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
};

/** Telegram settings persisted per-plugin. */
export namespace TelegramBotCapabilities {
  export const SettingsSchema = Schema.mutable(
    Schema.Struct({
      /** Bot token for Telegram Bot API access. */
      botToken: Schema.optional(Schema.String),
      /** Chat IDs the agent monitors (stringified for consistency). */
      monitoredChats: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
      /** Whether to respond to @mentions in groups. */
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
