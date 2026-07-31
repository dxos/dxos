//
// Copyright 2024 DXOS.org
//

import { generateName } from '@dxos/display-name';
import { type MessageMetadata } from '@dxos/react-ui-thread';
import { hexToFallback, toFallback } from '@dxos/util';

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
const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
};

export const getMessageMetadata = (
  id: string,
  identity?: MessageAuthor,
  /**
   * Externally-sourced sender info (Slack/Discord/etc). Used only when no
   * matching DXOS `identity` is available — provides `name`/`email` for the
   * author label and a stable seed for the avatar fallback.
   */
  fallbackSender?: { name?: string; email?: string },
  /** ISO date string when the message was sent; omitted for the composer's own metadata. */
  created?: string,
): MessageMetadata => {
  const fallback = identity?.identityKey
    ? hexToFallback(identity.identityKey)
    : toFallback(hashString(fallbackSender?.name ?? fallbackSender?.email ?? '0'));
  return {
    id,
    timestamp: created,
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
