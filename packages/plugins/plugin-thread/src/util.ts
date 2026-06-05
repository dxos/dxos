//
// Copyright 2024 DXOS.org
//

import * as Match from 'effect/Match';

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type Selection } from '@dxos/react-ui-attention';
import { type MessageMetadata } from '@dxos/react-ui-thread';
import { hexToFallback, toFallback } from '@dxos/util';

export type MessagePropertiesProvider = (identityKey: PublicKey | undefined) => MessageMetadata;

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
  identity?: Identity,
  /**
   * Externally-sourced sender info (Slack/Discord/etc). Used only when no
   * matching DXOS `identity` is available — provides `name`/`email` for the
   * author label and a stable seed for the avatar fallback.
   */
  fallbackSender?: { name?: string; email?: string },
): MessageMetadata => {
  const fallback = identity?.identityKey
    ? hexToFallback(identity.identityKey.toHex())
    : toFallback(hashString(fallbackSender?.name ?? fallbackSender?.email ?? '0'));
  return {
    id,
    authorId: identity?.did,
    authorName:
      identity?.profile?.displayName ??
      (identity?.identityKey ? generateName(identity.identityKey.toHex()) : undefined) ??
      fallbackSender?.name ??
      fallbackSender?.email,
    authorAvatarProps: {
      hue: identity?.profile?.data?.hue ?? fallback.hue,
      emoji: identity?.profile?.data?.emoji ?? fallback.emoji,
    },
  };
};

export const getAnchor = Match.type<Selection | undefined>().pipe(
  Match.when({ mode: 'single' }, (s) => s.id),
  Match.when({ mode: 'multi' }, (s) => (s.ids.length > 0 ? s.ids.join(',') : undefined)),
  Match.when({ mode: 'range' }, (s) => (s.from && s.to ? `${s.from}:${s.to}` : undefined)),
  Match.when({ mode: 'multi-range' }, (s) => s.ranges[0] && `${s.ranges[0].from}:${s.ranges[0].to}`),
  Match.when(undefined, () => undefined),
  Match.exhaustive,
);
