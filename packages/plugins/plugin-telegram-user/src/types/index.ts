//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

/** MTProto client connection status. */
export type TelegramUserConnectionStatus =
  | 'disconnected'
  | 'need-credentials'
  | 'logging-in'
  | 'need-code'
  | 'need-password'
  | 'connected'
  | 'error';

/** A single chat discovered as messages arrive. */
export type TelegramUserChat = {
  id: string;
  title: string;
  type: 'user' | 'chat' | 'channel';
  unread: number;
};

/** Settings persisted per-plugin. The session string is equivalent to a Telegram login — guard it. */
export namespace TelegramUserCapabilities {
  export const SettingsSchema = Schema.mutable(
    Schema.Struct({
      /** API ID from https://my.telegram.org (integer as string for KVS-safety). */
      apiId: Schema.optional(Schema.String),
      /** API hash from https://my.telegram.org. */
      apiHash: Schema.optional(Schema.String),
      /** Phone number used for the initial login. */
      phoneNumber: Schema.optional(Schema.String),
      /** StringSession payload saved after a successful login. Equivalent to a Telegram login cookie. */
      sessionString: Schema.optional(Schema.String),
    }),
  );

  export type Settings = Schema.Schema.Type<typeof SettingsSchema>;

  export const Settings = Capability.make<import('@effect-atom/atom').Atom.Writable<Settings>>(
    `${meta.id}.capability.settings`,
  );
}
