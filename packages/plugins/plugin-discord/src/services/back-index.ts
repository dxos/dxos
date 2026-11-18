//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Trigger from '@dxos/compute/Trigger';

/** The part of a back-index trigger's input that names its bot and channels. */
const BackIndexInput = Schema.Struct({
  applicationId: Schema.String,
  channels: Schema.Array(Schema.String),
  state: Schema.Unknown,
});

export type BackIndex = {
  readonly trigger: Trigger.Trigger;
  readonly channels: readonly string[];
};

/**
 * The back-index of the bot `applicationId` among the space's triggers: the one whose input names that bot and its
 * crawl state, as `ConfigureBackIndex` writes it. A space keeps one per bot.
 */
export const findBackIndex = (triggers: readonly Trigger.Trigger[], applicationId: string): BackIndex | undefined => {
  for (const trigger of triggers) {
    const input = Schema.decodeUnknownOption(BackIndexInput)(trigger.input);
    if (Option.isSome(input) && input.value.applicationId === applicationId) {
      return { trigger, channels: input.value.channels };
    }
  }
  return undefined;
};

/** The channels after toggling `channelId`: added when absent, removed when present. */
export const toggleChannel = (channels: readonly string[], channelId: string): string[] =>
  channels.includes(channelId) ? channels.filter((id) => id !== channelId) : [...channels, channelId];
