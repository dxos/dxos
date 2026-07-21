//
// Copyright 2024 DXOS.org
//

import * as Match from 'effect/Match';

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/keys';
import { type Selection } from '@dxos/react-ui-attention';
import { type MessageMetadata } from '@dxos/react-ui-thread';
import { hexToFallback, toFallback } from '@dxos/util';

export type MessagePropertiesProvider = (identityKey: PublicKey | undefined) => MessageMetadata;

/**
 * Minimal author shape for message metadata. Satisfied by both the `@dxos/halo`
 * `Identity.Info` and `Space.Member` (hex `identityKey`, flat `displayName`/`data`).
 */
export type MessageAuthor = {
  did?: string;
  identityKey?: string;
  displayName?: string;
  // Arbitrary profile metadata (matches the `@dxos/halo` `Schema.Any`-valued `data`).
  data?: { readonly [key: string]: any };
};

/**
 * Stable hash for an arbitrary string — used as the avatar-fallback seed for
 * external senders who have no DXOS identity (e.g. Slack/Discord-synced
 * messages). djb2-ish, only stability matters.
 *
 * Coerced to unsigned 32-bit via `>>> 0` because `toFallback` does a plain
 * modulo against `idEmoji.length * idHue.length` and JavaScript's `%`
 * preserves the sign of the dividend — a negative hash would index
 * `idEmoji[-x]` and `idHue[-x]` to `undefined`, causing the avatar to fall
 * through to `Avatar.Content`'s default red/ghost.
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let index = 0; index < str.length; index++) {
    hash = (hash * 31 + str.charCodeAt(index)) | 0;
  }
  return hash >>> 0;
};

/**
 * Resolve presentational metadata (author name, avatar) for a message.
 */
export const getMessageMetadata = (
  id: string,
  identity?: MessageAuthor,
  /**
   * Externally-sourced sender info (Slack/Discord/etc). Used only when no
   * matching DXOS `identity` is available — provides `name`/`email` for the
   * author label and a stable seed for the avatar fallback.
   */
  fallbackSender?: { name?: string; email?: string },
): MessageMetadata => {
  const fallback = identity?.identityKey
    ? hexToFallback(identity.identityKey)
    : toFallback(hashString(fallbackSender?.name ?? fallbackSender?.email ?? '0'));
  return {
    id,
    authorId: identity?.did,
    authorName:
      identity?.displayName ??
      (identity?.identityKey ? generateName(identity.identityKey) : undefined) ??
      fallbackSender?.name ??
      fallbackSender?.email,
    authorAvatarProps: {
      hue: identity?.data?.hue ?? fallback.hue,
      emoji: identity?.data?.emoji ?? fallback.emoji,
    },
  };
};

/**
 * Derive the anchor string for a selection.
 */
export const getAnchor = Match.type<Selection | undefined>().pipe(
  Match.when({ mode: 'single' }, (selection) => selection.id),
  Match.when({ mode: 'multi' }, (selection) => (selection.ids.length > 0 ? selection.ids.join(',') : undefined)),
  Match.when({ mode: 'range' }, (selection) =>
    selection.from && selection.to ? `${selection.from}:${selection.to}` : undefined,
  ),
  Match.when(
    { mode: 'multi-range' },
    (selection) => selection.ranges[0] && `${selection.ranges[0].from}:${selection.ranges[0].to}`,
  ),
  Match.when(undefined, () => undefined),
  Match.exhaustive,
);
